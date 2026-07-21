import { inject, injectable } from 'inversify';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import winston from 'winston';
import { CommandPhrase } from '../../database';
import { defaultPhrases, phraseFamilies } from './default-phrases';
import InjectionTypes from '../../dependency-management/types';

export type PhraseGenericResult =
    'invalidInput' |
    'invalidTemplate';

export type PhraseUpdateResult = PhraseGenericResult |
    'notEditable' |
    'updated' |
    'updateFailed';

export type PhraseInsertResult = PhraseGenericResult |
    'alreadyExists' |
    'invalidCommandName' |
    'inserted';

type PhraseEntry = { variant: string; template: string };

const cacheKey = (name: string, variant: string = ''): string => (variant ? `${name}.${variant}` : name);

@injectable()
export default class PhraseService {
    private phraseCache = new Map<string, PhraseEntry>();

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async initialize(): Promise<void> {
        await CommandPhrase.seed(defaultPhrases);

        const rows = await CommandPhrase.findAll();
        this.phraseCache = new Map(rows
            .map((row): [string, PhraseEntry] => [
                cacheKey(row.commandName, row.variant),
                { variant: row.variant, template: row.template },
            ]));
    }

    isValidCommandName(commandName: string): boolean {
        return Object.keys(phraseFamilies).some(x => x === commandName);
    }

    getCommandVariants(commandName: string): string[] {
        if (!commandName) {
            return [];
        }

        return [...this.phraseCache.entries()]
            .filter(([key]) => key === commandName || key.startsWith(`${commandName}.`))
            .map(([, entry]) => entry.variant);
    }

    getCommandTemplate(commandName: string, variant: string = ''): string | undefined {
        if (!commandName) {
            return undefined;
        }

        return this.phraseCache.get(cacheKey(commandName, variant))?.template;
    }

    async addCommandTemplate(commandName: string, template: string, variant: string = ''): Promise<PhraseInsertResult> {
        if (!commandName || !template || !variant) {
            return 'invalidInput';
        }

        if (!this.isValidCommandName(commandName)) {
            return 'invalidCommandName';
        }

        if (this.phraseCache.has(cacheKey(commandName, variant))) {
            return 'alreadyExists';
        }

        try {
            await CommandPhrase.addCommandTemplate(commandName, template, variant);

            this.phraseCache.set(cacheKey(commandName, variant), { variant, template });

            return 'inserted';
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return 'alreadyExists';
            }
            if (error instanceof ValidationError) {
                return 'invalidTemplate';
            }
            throw error;
        }
    }

    /**
     * Update the command with the provided template
     * @param commandName Command to update
     * @param template new template value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    async setCommandTemplate(commandName: string, template: string, variant: string = ''): Promise<PhraseUpdateResult> {
        if (!commandName || !template) {
            return 'invalidInput';
        }

        if (!this.phraseCache.has(cacheKey(commandName, variant))) {
            return 'notEditable';
        }

        try {
            const command = await CommandPhrase.updateCommandTemplate(commandName, template, variant);

            if (command) {
                this.phraseCache.set(cacheKey(commandName, variant), { variant, template });

                return 'updated';
            }

            this.logger.warn(` Valid command (${cacheKey(commandName, variant)}) database update attempt failed.`);
        } catch (error) {
            if (error instanceof ValidationError) {
                return 'invalidTemplate';
            }
            throw error;
        }

        return 'updateFailed';
    }
}
