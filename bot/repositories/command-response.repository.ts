import { inject, injectable } from 'inversify';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import winston from 'winston';
import { CommandResponse } from '../../database/index.js';
import { defaultResponses, CommandFamilies } from '../utilities/default-responses.js';
import InjectionTypes from '../../dependency-management/types.js';

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

export type CommandTextRemoveResult = CommandTextValidationResult |
    'notFound' |
    'removed' |
    'removeFailed';

export type CommandTextRestoreResult = CommandTextValidationResult |
    'notFound' |
    'alreadyActive' |
    'restored';

type ResponseEntry = { variant: string; text: string };

const cacheKey = (name: string, variant: string = ''): string => (variant ? `${name}.${variant}` : name);

@injectable()
export default class CommandResponseRepository {
    private responseCache = new Map<string, ResponseEntry>();

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async initialize(): Promise<void> {
        await CommandResponse.seed(defaultResponses);

        const rows = await CommandResponse.findAll();
        this.responseCache = new Map(rows
            .map((row): [string, ResponseEntry] => [
                cacheKey(row.commandName, row.variant),
                { variant: row.variant, text: row.text },
            ]));
    }

    isValidCommandName(commandName: string): boolean {
        return Object.keys(CommandFamilies).some(x => x === commandName);
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

    /**
     * Add the command/variant with the provided text
     * @param commandName Command to add
     * @param text new text value for the Command
     * @param variant The command name variant to add
     * @returns boolean flag denoting if the provided command/variant was created
     */
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
            const [restored] = await CommandResponse.restoreCommandText(commandName, variant);

            if (restored) {
                await CommandResponse.updateCommandText(commandName, text, variant);
            } else {
                await CommandResponse.addCommandText(commandName, text, variant);
            }

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
     * Update the command/variant with the provided text
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

    /**
     * Remove (soft-delete) the command/variant
     * @param commandName Command to remove
     * @param variant The command variant to remove
     * @returns boolean flag denoting if the provided command/variant was removed
     */
    async removeCommandText(commandName: string, variant: string = ''): Promise<CommandTextRemoveResult> {
        if (!commandName || !variant) {
            return 'invalidInput';
        }

        if (!this.responseCache.has(cacheKey(commandName, variant))) {
            return 'notFound';
        }

        const result = await CommandResponse.removeCommandText(commandName, variant);

        if (result) {
            this.responseCache.delete(cacheKey(commandName, variant));
            return 'removed';
        }

        this.logger.warn(`Valid command (${cacheKey(commandName, variant)}) database remove attempt failed.`);
        return 'removeFailed';
    }

    /**
     * Restore the command/variant from its soft-delete state
     * @param commandName Command to restore
     * @param variant The command variant to restore
     * @returns boolean flag denoting if the provided command/variant was restored
     */
    async restoreCommandText(commandName: string, variant: string = ''): Promise<CommandTextRestoreResult> {
        if (!commandName || !variant) {
            return 'invalidInput';
        }

        if (!this.responseCache.has(cacheKey(commandName, variant))) {
            const [restored, command] = await CommandResponse.restoreCommandText(commandName, variant);

            if (restored && command) {
                this.responseCache.set(cacheKey(command.commandName, command.variant), { variant: command.variant, text: command.text });
                return 'restored';
            }

            if (!command) {
                return 'notFound';
            }
        }

        return 'alreadyActive';
    }
}
