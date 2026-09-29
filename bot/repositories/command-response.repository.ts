import { inject, injectable } from 'inversify';
import winston from 'winston';
import { CommandResponseDbo, CommandResponseTextDbo } from '../../database/index.js';
import InjectionTypes from '../../dependency-management/types.js';
import Database from '../../database/database.js';

export type CommandResponseText = {
    text: string,
    weight: number,
};

function toCommandResponseText(x: CommandResponseTextDbo): CommandResponseText {
    return ({
        text: x.text,
        weight: Number(x.weight),
    });
}

export type CommandResponse = {
    commandName: string,
    variant: string,
    texts: CommandResponseText[],
};

function toCommandResponse(x: CommandResponseDbo): CommandResponse {
    return ({
        commandName: x.commandName,
        variant: x.variant,
        texts: (x.texts ?? []).map(toCommandResponseText),
    });
}

export type CommandResponseUpdate = CommandResponse & {
    originalName?: string,
    originalVariant?: string,
    originalText?: string,
};

@injectable()
export default class CommandResponseRepository {
    constructor(
        @inject(Database) private database: Database,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async seed(entries: Record<string, Record<string, string[]>>): Promise<void> {
        const records = Object
            .entries(entries)
            .flatMap(([commandName, variants]) => Object
                .entries(variants)
                .map(([variant, text]) => ({
                    commandName,
                    variant,
                    texts: text.map(x => ({ text: x })),
                })));

        try {
            await this.database.transaction(async transaction => {
                const existingRecords = new Set((await CommandResponseDbo
                    .findAll({
                        paranoid: false,
                        transaction,
                    }))
                    .map(x => JSON.stringify([x.commandName, x.variant])));

                const newRecords = records
                    .filter(x => !existingRecords.has(JSON.stringify([x.commandName, x.variant])));

                if (newRecords.length === 0) {
                    return;
                }

                await CommandResponseDbo
                    .bulkCreate(
                        newRecords,
                        {
                            include: {
                                model: CommandResponseTextDbo,
                                as: 'texts',
                            },
                            validate: true,
                            transaction,
                        },
                    );
            });
        } catch (error) {
            this.logger.error(`Failed to Seed Data for CommandResponse/Text`, error);
        }
    }

    async findAll(): Promise<CommandResponse[]> {
        return (await CommandResponseDbo
            .findAll({ include: CommandResponseTextDbo }))
            .map(toCommandResponse);
    }

    /**
     * Get the command text based on the provided commandName and variant
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    async getCommandText(commandName: string, variant: string = ''): Promise<CommandResponseText[]> {
        const records = await CommandResponseDbo
            .findOne({
                where: {
                    commandName,
                    variant,
                },
                include: CommandResponseTextDbo,
            });

        const textResponses = records?.texts
            .map(toCommandResponseText);

        return textResponses ?? [];
    }

    /**
     * Get the command variants based on the provided commandName
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    async getCommandVariants(commandName: string): Promise<string[]> {
        const records = await CommandResponseDbo
            .findAll({
                where: {
                    commandName,
                },
            });

        const variants = records.map(x => x.variant);

        return variants;
    }

    /**
     * Create a new command record with the default variant and no text responses
     * @param commandName to be created
     * @returns database command record
     */
    async addCommand(commandName: string): Promise<CommandResponse | null> {
        try {
            const [record] = await CommandResponseDbo
                .findOrCreate({
                    where: {
                        commandName,
                        variant: '',
                    },
                    defaults: {
                    commandName,
                    },
                    paranoid: false,
                    isNewRecord: true,
                    validate: true,
                });

            if (record.isSoftDeleted()) {
                await record.restore();
            }

            return toCommandResponse(record);
        } catch (error) {
            this.logger.error(`Failed to create CommandResponse in database`, error);
        }

        return null;
    }

    /**
     * Update the command record with a new commandName
     * @param commandName the command to change
     * @param newCommandName the new name for the command
     * @returns updated command record with original name
     */
    async updateCommand(commandName: string, newCommandName: string): Promise<CommandResponseUpdate[]> {
        try {
            const [, records] = await CommandResponseDbo
                .update({
                    commandName: newCommandName,
                }, {
                    where: {
                        commandName,
                    },
                    returning: true,
                });

            return records.map(x => (<unknown>{
                commandName: x.commandName,
                variant: x.variant,
                originalName: commandName,
            } as CommandResponseUpdate));
        } catch (error) {
            this.logger.error(`Failed to update CommandResponse CommandName in database`, error);
        }

        return [];
    }

    /**
     * Update the command variant record with a new variant name
     * @param commandName the command which is connected with the variant
     * @param variant the variant to change
     * @param newVariant the new name for the command
     * @returns updated command record with original name
     */
    async updateCommandVariant(commandName: string, variant: string, newVariant: string): Promise<CommandResponseUpdate | null> {
        try {
            const [, records] = await CommandResponseDbo
                .update({
                    variant: newVariant,
                }, {
                    where: {
                        commandName,
                        variant,
                    },
                    returning: true,
                });

            return records.map(x => ({
                commandName: x.commandName,
                variant: x.variant,
                originalVariant: variant,
            } as CommandResponseUpdate))[0];
        } catch (error) {
            this.logger.error(`Failed to update CommandResponse Variant in database`, error);
        }

        return null;
    }

    async addCommandVariant(commandName: string, variant: string): Promise<CommandResponse | null> {
        try {
            const [record] = await CommandResponseDbo
                .findOrCreate({
                    where: {
                        commandName,
                        variant,
                    },
                    defaults: {
                        commandName,
                        variant,
                    },
                    paranoid: false,
                    isNewRecord: true,
                    validate: true,
                });

            if (record.isSoftDeleted()) {
                await record.restore();
            }

            return toCommandResponse(record);
        } catch (error) {
            this.logger.error(`Failed to create CommandResponse in database`, error);
        }

        return null;
    }

    /**
     * Inserts the provided command with variant and text
     * @param commandName The command name to fetch
     * @param text new text value for the Command
     * @param variant The command name variant to fetch
     * @returns The created command if successful, rejected error otherwise
     */
    async addCommandText(commandName: string, text: string, variant: string = ''): Promise<CommandResponse | null> {
        try {
            return await this.database.transaction(async transaction => {
            const [parentRecord] = await CommandResponseDbo
                .findOrCreate({
                    where: {
                        commandName,
                        variant,
                    },
                    defaults: {
                commandName,
                variant,
                    },
                        paranoid: false,
                isNewRecord: true,
                validate: true,
                        transaction,
            });

                if (parentRecord.isSoftDeleted()) {
                    await parentRecord.restore({
                        transaction,
                    });
                }

            const record = await CommandResponseTextDbo
                .create({
                    commandResponseId: parentRecord.id,
                    text,
                    }, {
                        transaction,
                });

            if (record) {
                return {
                    commandName: parentRecord.commandName,
                    variant: parentRecord.variant,
                    texts: [{
                        text: record.text,
                        weight: Number(record.weight),
                    } as CommandResponseText],
                } as CommandResponse;
            }

            this.logger.warn(`Failed to create CommandResponseText`);
                return null;
            });
        } catch (error) {
            this.logger.error(`Error creating command records in the database`, error);
        }

        return null;
    }

    /**
     * Update existing command based on the provided text
     * @param commandName The command name to update
     * @param text new text value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    async updateCommandText(commandName: string, text: string, variant: string = ''): Promise<boolean> {
        const [count] = await CommandResponseDbo
            .update(
                { texts: [text] },
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
     * Soft-Delete specified command including all variants, if present
     * @param commandName The command name to remove
     * @param variant The command name variant to remove
     * @returns boolean flag denoting if the provided command was removed
     */
    async removeCommand(commandName: string): Promise<boolean> {
        try {
            return await this.database.transaction(async transaction => {
                const commands = await CommandResponseDbo
                    .findAll({
                        where: {
                            commandName,
                        },
                        transaction,
                    });

                if (commands.length === 0) {
                    return false;
                }

                await CommandResponseTextDbo
                    .destroy({
                        where: {
                            commandResponseId: commands.map(x => x.id),
                        },
                        transaction,
                    });

            const count = await CommandResponseDbo
                .destroy({
                    where: {
                        commandName,
                    },
                        transaction,
                });

            return count > 0;
            });
        } catch (error) {
            this.logger.error(`Error removing the command from database`, error);
        }

        return false;
    }

    /**
     * Soft-Delete specified command variant, if present
     * @param commandName The command name to remove
     * @param variant The command name variant to remove
     * @returns boolean flag denoting if the provided command was removed
     */
    async removeCommandVariant(commandName: string, variant: string): Promise<boolean> {
        try {
            return await this.database.transaction(async transaction => {
                const commands = await CommandResponseDbo
                    .findAll({
                        where: {
                            commandName,
                            variant,
                        },
                        transaction,
                    });

                if (commands.length === 0) {
                    return false;
                }

                await CommandResponseTextDbo
                    .destroy({
                        where: {
                            commandResponseId: commands.map(x => x.id),
                        },
                        transaction,
                    });

            const count = await CommandResponseDbo
            .destroy({
                where: {
                    commandName,
                    variant,
                },
                        transaction,
            });

        return count === 1;
            });
        } catch (error) {
            this.logger.error(`Error removing the command variant from database`, error);
        }

        return false;
    }

    /**
     * Restores the specific command provided
     * @param commandName The command to restore
     * @returns all restored records with text
     */
    async restoreCommand(commandName: string): Promise<CommandResponse[]> {
        try {
            const records = await this.database.transaction(async transaction => {
                await CommandResponseDbo
                    .restore({
                        where: {
                            commandName,
                        },
                        transaction,
                    });

                const parents = await CommandResponseDbo
                    .findAll({
                        where: {
                            commandName,
                        },
                        transaction,
                    });

                const textRecords = await CommandResponseTextDbo
                    .restore({
                        where: {
                            commandResponseId: parents.map(x => x.id),
                        },
                        transaction,
                    });

                return CommandResponseDbo
                    .findAll({
                        where: {
                            commandName,
                        },
                        include: [CommandResponseTextDbo],
                        transaction,
                    });
            });

            return records.map(toCommandResponse);
        } catch (error) {
            this.logger.error(`There was an error restoring the CommandResponse for the command`, error);
        }

        return [];
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
