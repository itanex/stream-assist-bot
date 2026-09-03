import { inject, injectable } from 'inversify';
import winston from 'winston';
import { CommandResponse } from '../../database/index.js';
import InjectionTypes from '../../dependency-management/types.js';

@injectable()
export default class CommandResponseRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async seed(entries: Record<string, Record<string, string>>): Promise<void> {
        const records = Object
            .entries(entries)
            .flatMap(([commandName, variants]) => Object
                .entries(variants)
                .map(([variant, text]) => ({
                    commandName,
                    variant,
                    text,
                })));

        await CommandResponse
            .bulkCreate(
                records,
                {
                    ignoreDuplicates: true,
                    validate: true,
                },
            );
    }

    async findAll(): Promise<CommandResponse[]> {
        return CommandResponse
            .findAll();
    }

    /**
     * Get the command text based on the provided commandName
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    async getCommandText(commandName: string, variant: string = ''): Promise<CommandResponse | null> {
        return CommandResponse
            .findOne({
                where: {
                    commandName,
                    variant,
                },
            });
    }

    /**
     * Get the command variants based on the provided commandName
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    async getCommandVariants(commandName: string): Promise<CommandResponse[]> {
        return CommandResponse
            .findAll({
                where: {
                    commandName,
                },
            });
    }

    /**
     * Inserts the provided command with variant and text
     * @param commandName The command name to fetch
     * @param text new text value for the Command
     * @param variant The command name variant to fetch
     * @returns The created command if successful, rejected error otherwise
     */
    async addCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandResponse> {
        return CommandResponse
            .create({
                commandName,
                variant,
                text,
            }, {
                isNewRecord: true,
                validate: true,
            });
    }

    /**
     * Update existing command based on the provided text
     * @param commandName The command name to update
     * @param text new text value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    async updateCommandText(commandName: string, text: string, variant: string = ''): Promise<boolean> {
        const [count] = await CommandResponse
            .update(
                { text },
                {
                    where: {
                        commandName,
                        variant,
                    },
                },
            );

        return count === 1;
    }

    /**
     * Soft-Delete specified command, if present
     * @param commandName The command name to remove
     * @param variant The command name variant to remove
     * @returns boolean flag denoting if the provided command was removed
     */
    async removeCommandText(commandName: string, variant: string = ''): Promise<boolean> {
        const count = await CommandResponse
            .destroy({
                where: {
                    commandName,
                    variant,
                },
            });

        return count === 1;
    }

    /**
     * Restore specified command, if present
     * @param commandName The command name to restore
     * @param variant The command name variant to restore
     * @returns boolean flag denoting if the provided command was restored
     */
    async restoreCommandText(commandName: string, variant: string = ''): Promise<[boolean, CommandResponse | null]> {
        const command = await CommandResponse
            .findOne({
                where: {
                    commandName,
                    variant,
                },
                paranoid: false,
            });

        if (command?.deletedAt) {
            await CommandResponse
                .restore({
                    where: {
                        commandName,
                        variant,
                    },
                });

            return [true, command];
        }

        return [false, command];
    }
}
