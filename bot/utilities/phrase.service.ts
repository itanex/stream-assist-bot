import { injectable } from 'inversify';
import { ValidationError } from 'sequelize';
import { CommandPhrase } from '../../database';
import { defaultPhrases, PhraseKey } from './default-phrases';

@injectable()
export default class PhraseService {
    private phraseCache = new Map<string, string>();

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
    async setCommandTemplate(commandName: string, template: string): Promise<boolean> {
        if (!commandName || !template) {
            return false;
        }

        try {
            const command = await CommandPhrase.updateCommandTemplate(commandName, template);

            if (command) {
                this.phraseCache.set(commandName, template);

                return true;
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                return false;
            }
            throw error;
        }

        return false;
    }
}
