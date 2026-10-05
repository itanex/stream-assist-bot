import { inject, injectable } from 'inversify';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import winston from 'winston';
import { defaultResponses, CommandFamilies } from '../utilities/default-responses.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandResponseRepository } from '../repositories/index.js';
import { type CommandResponseText } from '../repositories/command-response.repository.js';

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
     * Add the command/variant with the provided text
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
     * Update the command/variant with the provided text
     * @param commandName Command to update
     * @param text new text value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    async updateCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandTextUpdateResult> {
        if (!commandName || !text) {
            return 'invalidInput';
        }

        if (!this.responseCache.has(cacheKey(commandName, variant))) {
            return 'notEditable';
        }

        try {
            const command = await this.commandResponseRepository
                .updateCommandText(commandName, text, variant);

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
    async removeCommandText(commandName: string, variant: string): Promise<CommandTextRemoveResult> {
        if (!commandName) {
            return 'invalidInput';
        }

        if (!this.responseCache.has(cacheKey(commandName, variant))) {
            return 'notFound';
        }

        const result = await this.commandResponseRepository
            .removeCommandText(commandName, variant);

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
    async restoreCommandText(commandName: string, variant: string): Promise<CommandTextRestoreResult> {
        if (!commandName) {
            return 'invalidInput';
        }

        const cached = this.responseCache.has(cacheKey(commandName, variant));

        if (cached) {
            return 'alreadyActive';
        }

        const [restored, command] = await this.commandResponseRepository
            .restoreCommandText(commandName, variant);

        if (restored && command) {
            this.responseCache.set(cacheKey(command.commandName, command.variant), { variant: command.variant, text: command.text });
            return 'restored';
        }

        return 'notFound';
    }
}
