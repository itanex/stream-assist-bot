import { inject, injectable } from 'inversify';
import { ValidationError } from 'sequelize';
import winston from 'winston';
import { CommandPhrase } from '../../database';
import { defaultPhrases } from './default-phrases';
import InjectionTypes from '../../dependency-management/types';

export type PhraseUpdateResult =
    'updated' |
    'invalidInput' |
    'notEditable' |
    'invalidTemplate' |
    'updateFailed';

@injectable()
export default class PhraseService {
    private phraseCache = new Map<string, string>();

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async initialize(): Promise<void> {
        await CommandPhrase.seed(defaultPhrases);

        const rows = await CommandPhrase.findAll();
        this.phraseCache = new Map(rows
            .map((row): [string, string] => [row.commandName, row.template]));
    }

    getCommandTemplate(commandName: string): string | undefined {
        if (!commandName) {
            return undefined;
        }

        return this.phraseCache.get(commandName);
    }

    /**
     * Update the command with the provided template
     * @param commandName Command to update
     * @param template new template value for the Command
     * @returns boolean flag denoting if the provided command was updated
     */
    async setCommandTemplate(commandName: string, template: string): Promise<PhraseUpdateResult> {
        if (!commandName || !template) {
            return 'invalidInput';
        }

        if (!this.phraseCache.has(commandName)) {
            return 'notEditable';
        }

        try {
            const command = await CommandPhrase.updateCommandTemplate(commandName, template);

            if (command) {
                this.phraseCache.set(commandName, template);

                return 'updated';
            }

            this.logger.warn(` Valid command (${commandName}) database update attempt failed.`);
        } catch (error) {
            if (error instanceof ValidationError) {
                return 'invalidTemplate';
            }
            throw error;
        }

        return 'updateFailed';
    }
}
