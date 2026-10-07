import { inject, injectable } from 'inversify';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import winston from 'winston';
import { defaultResponses, CommandFamilies } from '../utilities/default-responses.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandResponseRepository } from '../repositories/index.js';
import { CommandResponseTextChanges, type CommandResponseText } from '../repositories/command-response.repository.js';

export type CommandTextValidationResult =
    'invalidInput' |
    'invalidText';

export type CommandTextUpdateResult = CommandTextValidationResult |
    'alreadyExists' |
    'notEditable' |
    'updated' |
    'updateFailed';

export type CommandTextInsertResult = CommandTextValidationResult |
    'alreadyExists' |
    'invalidCommandName' |
    'insertFailed' |
    'inserted';

export type CommandTextRemoveResult = CommandTextValidationResult |
    'notFound' |
    'removed' |
    'removeFailed';

export type CommandTextRestoreResult = CommandTextValidationResult |
    'notFound' |
    'alreadyActive' |
    'restored';

type ResponseEntry = {
    variant: string;
    responses: CommandResponseText[]
};

export const cacheKey = (name: string, variant: string = ''): string => (variant ? `${name}.${variant}` : name);

@injectable()
export default class CommandResponseService {
    private responseCache = new Map<string, ResponseEntry>();

    constructor(
        @inject(CommandResponseRepository) private commandResponseRepository: CommandResponseRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async initialize(): Promise<void> {
        await this.commandResponseRepository
            .seed(defaultResponses);

        const rows = await this.commandResponseRepository.findAll();
        this.responseCache = new Map(rows
            .map((row): [string, ResponseEntry] => [
                cacheKey(row.commandName, row.variant),
                {
                    variant: row.variant,
                    responses: row.texts,
                },
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

    getCommandResponse(commandName: string, variant: string): string | undefined {
        if (!commandName) {
            return undefined;
        }

        const responses = this.responseCache.get(cacheKey(commandName, variant))?.responses;

        if (responses?.length) {
            // TODO: Update this to a weighted random selection algorithm (#155)
            const index = Math.floor(Math.random() * responses.length);

            return responses[index].text;
        }

        return undefined;
    }

    /**
     * Add the command/variant with the provided text/weight
     * @param commandName Command to add
     * @param text new text value for the Command
     * @param variant The command name variant to add
     */
    async addCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandTextInsertResult> {
        if (!commandName || !text) {
            return 'invalidInput';
        }

        if (!this.isValidCommandName(commandName)) {
            return 'invalidCommandName';
        }

        try {
            const addedResponse = await this.commandResponseRepository
                .addCommandText(commandName, text, variant);

            if (!addedResponse) {
                return 'insertFailed';
            }

            const records = this.responseCache.get(cacheKey(commandName, variant));

            if (records) {
                records.responses.push(addedResponse.texts[0]);
            } else {
                this.responseCache.set(cacheKey(commandName, variant), {
                    variant,
                    responses: addedResponse.texts,
                });
            }

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
     * Update the command/variant with the provided text/weight
     * @param commandName Command to update
     * @param variant The command name variant to update
     * @param id the id of the text to update
     * @param changes The text and/or weight to apply
     */
    async updateCommandText(commandName: string, variant: string, id: number, changes: CommandResponseTextChanges): Promise<CommandTextUpdateResult> {
        if (!commandName || (changes.text !== undefined && !changes.text) || (!changes.text && changes.weight === undefined)) {
            return 'invalidInput';
        }

        const cacheRecord = this.responseCache.get(cacheKey(commandName, variant));
        const index = cacheRecord
            ?.responses
            ?.findIndex(x => x.id === id) ?? -1;

        if (!cacheRecord || index === -1) {
            return 'notEditable';
        }

        try {
            const command = await this.commandResponseRepository
                .updateCommandText(commandName, variant, id, changes);

            if (command) {
                cacheRecord.responses[index] = command;

                return 'updated';
            }

            this.logger.warn(` Valid command (${cacheKey(commandName, variant)}) textid: ${id} database update attempt failed.`);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                return 'alreadyExists';
            }

            if (error instanceof ValidationError) {
                return 'invalidText';
            }

            throw error;
        }

        return 'updateFailed';
    }

    /**
     * Remove (soft-delete) the command/variant text
     * @param commandName Command to remove
     * @param variant The command variant to remove
     * @param id of the text string to remove
     */
    async removeCommandText(commandName: string, variant: string, id: number): Promise<CommandTextRemoveResult> {
        if (!commandName || id === undefined) {
            return 'invalidInput';
        }

        const cacheRecord = this.responseCache.get(cacheKey(commandName, variant));
        const index = cacheRecord
            ?.responses
            ?.findIndex(x => x.id === id) ?? -1;

        if (!cacheRecord || index === -1) {
            return 'notFound';
        }

        const result = await this.commandResponseRepository
            .removeCommandText(commandName, variant, id);

        if (result) {
            cacheRecord.responses.splice(index, 1);
            return 'removed';
        }

        this.logger.warn(`Valid command (${cacheKey(commandName, variant)}) database remove attempt failed.`);
        return 'removeFailed';
    }

    /**
     * Restore the command/variant text
     * @param commandName Command to restore
     * @param variant The command variant to restore
     * @param id of the text string to remove
     */
    async restoreCommandText(commandName: string, variant: string, id: number): Promise<CommandTextRestoreResult> {
        if (!commandName || id === undefined) {
            return 'invalidInput';
        }

        const cacheRecord = this.responseCache.get(cacheKey(commandName, variant));
        const index = cacheRecord
            ?.responses
            ?.findIndex(x => x.id === id) ?? -1;

        if (index > -1) {
            return 'alreadyActive';
        }

        const restoredResponse = await this.commandResponseRepository
            .restoreCommandText(commandName, variant, id);

        if (restoredResponse) {
            if (cacheRecord) {
                cacheRecord.responses.push(restoredResponse);
            } else {
                this.responseCache.set(cacheKey(commandName, variant), {
                    variant,
                    responses: [restoredResponse],
                });
            }

            return 'restored';
        }

        return 'notFound';
    }
}
