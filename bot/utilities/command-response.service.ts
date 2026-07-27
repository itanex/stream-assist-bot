import { inject, injectable } from 'inversify';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import winston from 'winston';
import { CommandResponse } from '../../database';
import { defaultPhrases, phraseFamilies } from './default-phrases';
import InjectionTypes from '../../dependency-management/types';

export type CommandTextValidationResult =
    'invalidInput' |
    'invalidText';

export type CommandTextUpdateResult = CommandTextValidationResult |
    'notEditable' |
    'updated' |
    'updateFailed';

export type CommandTextInsertResult = CommandTextValidationResult |
    'alreadyExists' |
    'invalidCommandName' |
    'inserted';

type ResponseEntry = { variant: string; text: string };

const cacheKey = (name: string, variant: string = ''): string => (variant ? `${name}.${variant}` : name);

@injectable()
export default class CommandResponseService {
    private responseCache = new Map<string, ResponseEntry>();

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async initialize(): Promise<void> {
        await CommandResponse.seed(defaultPhrases);

        const rows = await CommandResponse.findAll();
        this.responseCache = new Map(rows
            .map((row): [string, ResponseEntry] => [
                cacheKey(row.commandName, row.variant),
                { variant: row.variant, text: row.text },
            ]));
    }

    isValidCommandName(commandName: string): boolean {
        return Object.keys(phraseFamilies).some(x => x === commandName);
    }

    getCommandVariants(commandName: string): string[] {
        if (!commandName) {
            return [];
        }

        return [...this.responseCache.entries()]
            .filter(([key]) => key === commandName || key.startsWith(`${commandName}.`))
            .map(([, entry]) => entry.variant);
    }

    getCommandText(commandName: string, variant: string = ''): string | undefined {
        if (!commandName) {
            return undefined;
        }

        return this.responseCache.get(cacheKey(commandName, variant))?.text;
    }

    async addCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandTextInsertResult> {
        if (!commandName || !text || !variant) {
            return 'invalidInput';
        }

        if (!this.isValidCommandName(commandName)) {
            return 'invalidCommandName';
        }

        if (this.responseCache.has(cacheKey(commandName, variant))) {
            return 'alreadyExists';
        }

        try {
            await CommandResponse.addCommandText(commandName, text, variant);

            this.responseCache.set(cacheKey(commandName, variant), { variant, text });

            return 'inserted';
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return 'alreadyExists';
            }
            if (error instanceof ValidationError) {
                return 'invalidText';
            }
            throw error;
        }
    }

    /**
     * Update the command with the provided text
     * @param commandName Command to update
     * @param text new text value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    async setCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandTextUpdateResult> {
        if (!commandName || !text) {
            return 'invalidInput';
        }

        if (!this.responseCache.has(cacheKey(commandName, variant))) {
            return 'notEditable';
        }

        try {
            const command = await CommandResponse.updateCommandText(commandName, text, variant);

            if (command) {
                this.responseCache.set(cacheKey(commandName, variant), { variant, text });

                return 'updated';
            }

            this.logger.warn(` Valid command (${cacheKey(commandName, variant)}) database update attempt failed.`);
        } catch (error) {
            if (error instanceof ValidationError) {
                return 'invalidText';
            }
            throw error;
        }

        return 'updateFailed';
    }
}
