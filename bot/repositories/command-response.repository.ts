import { randomUUID } from 'crypto';
import { inject, injectable } from 'inversify';
import {
    col,
    fn,
    Op,
    Transaction,
    UniqueConstraintError,
    ValidationError,
    where,
} from 'sequelize';
import winston from 'winston';
import { CommandResponseDbo, CommandResponseTextDbo } from '../../database/index.js';
import InjectionTypes from '../../dependency-management/types.js';
import Database from '../../database/database.js';

export type CommandResponseText = {
    id: number,
    text: string,
    weight: number,
};

export type CommandResponseTextChanges = Partial<Pick<CommandResponseText, 'text' | 'weight'>>;

function toCommandResponseText(x: CommandResponseTextDbo): CommandResponseText {
    return ({
        id: x.id,
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
                const hasCommands = (await CommandResponseDbo
                    .count({
                        paranoid: false,
                        transaction,
                    })) > 0;

                if (hasCommands) {
                    this.logger.info('Database::CommandReponse/Text Attempted to seed after database seeded');
                    return;
                }

                await CommandResponseDbo
                    .bulkCreate(
                        records,
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
     * Inserts the provided command with variant and text, restoring a matching removed text instead of inserting
     * @param commandName The command name to fetch
     * @param text new text value for the Command
     * @param variant The command name variant to fetch
     * @returns The created command if successful, null otherwise
     * @throws ValidationError when the text is invalid, UniqueConstraintError when the text already exists
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

                    await parentRecord.update({
                        deletionId: null,
                    }, {
                        transaction,
                    });
                }

                const removedRecord = await CommandResponseTextDbo
                    .findOne({
                        where: {
                            [Op.and]: [
                                { commandResponseId: parentRecord.id },
                                { deletedAt: { [Op.ne]: null } },
                                where(fn('lower', col('text')), fn('lower', text?.trim())),
                            ],
                        },
                        paranoid: false,
                        transaction,
                    });

                const record = removedRecord
                    ? await this.restoreText(removedRecord, transaction)
                    : await CommandResponseTextDbo
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
                        texts: [toCommandResponseText(record)],
                    } as CommandResponse;
                }

                this.logger.warn(`Failed to create CommandResponseText`);
                return null;
            });
        } catch (error) {
            if (error instanceof UniqueConstraintError || error instanceof ValidationError) {
                throw error;
            }

            this.logger.error(`Error creating command records in the database`, error);
        }

        return null;
    }

    /**
     * Update the specified command text
     * @param id The command text record to update
     * @param changes The text and/or weight to apply
     * @returns The updated command text if found, null otherwise
     * @throws ValidationError when the changes are invalid, UniqueConstraintError when the text already exists
     */
    async updateCommandText(id: number, changes: CommandResponseTextChanges): Promise<CommandResponseText | null> {
        try {
            const record = await CommandResponseTextDbo
                .findByPk(id);

            if (!record) {
                return null;
            }

            await record.update(changes);

            return toCommandResponseText(record);
        } catch (error) {
            if (error instanceof UniqueConstraintError || error instanceof ValidationError) {
                throw error;
            }

            this.logger.error(`Failed to update CommandResponseText in database`, error);
        }

        return null;
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

                const count = await this.softDeleteWithTexts(commands.map(x => x.id), transaction);

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

                const count = await this.softDeleteWithTexts(commands.map(x => x.id), transaction);

                return count === 1;
            });
        } catch (error) {
            this.logger.error(`Error removing the command variant from database`, error);
        }

        return false;
    }

    /**
     * Soft-Delete specified command text, if present
     * @param id The command text record to remove
     * @returns boolean flag denoting if the provided command text was removed
     */
    async removeCommandText(id: number): Promise<boolean> {
        try {
            const count = await CommandResponseTextDbo
                .destroy({
                    where: {
                        id,
                    },
                });

            return count === 1;
        } catch (error) {
            this.logger.error(`Error removing the command text from database`, error);
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
                const latest = await CommandResponseDbo
                    .findOne({
                        where: {
                            commandName,
                            deletedAt: { [Op.ne]: null },
                            deletionId: { [Op.ne]: null },
                        },
                        order: [['deletedAt', 'DESC']],
                        paranoid: false,
                        transaction,
                    });

                if (!latest?.deletionId) {
                    return [];
                }

                const parents = await CommandResponseDbo
                    .findAll({
                        where: {
                            commandName,
                            deletionId: latest.deletionId,
                        },
                        paranoid: false,
                        transaction,
                    });

                await this.restoreDeletion(latest.deletionId, parents.map(x => x.id), transaction);

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

    async restoreCommandVariant(commandName: string, variant: string): Promise<CommandResponse | null> {
        try {
            const record = await this.database.transaction(async transaction => {
                const parent = await CommandResponseDbo
                    .findOne({
                        where: {
                            commandName,
                            variant,
                        },
                        paranoid: false,
                        transaction,
                    });

                if (!parent) {
                    return null;
                }

                if (parent.isSoftDeleted() && parent.deletionId) {
                    await this.restoreDeletion(parent.deletionId, [parent.id], transaction);
                }

                return CommandResponseDbo
                    .findOne({
                        where: {
                            commandName,
                            variant,
                        },
                        include: [CommandResponseTextDbo],
                        transaction,
                    });
            });

            if (record) {
                return toCommandResponse(record);
            }

            return null;
        } catch (error) {
            this.logger.error(`There was an error restoring the CommandResponses`, error);
        }

        return null;
    }

    /**
     * Restore the specified command text, if removed and its command variant is active
     * @param commandName The command name that owns the text
     * @param variant The command name variant that owns the text
     * @param id The command text record to restore
     * @returns The restored command text if restored, null otherwise
     */
    async restoreCommandText(commandName: string, variant: string, id: number): Promise<CommandResponseText | null> {
        try {
            return await this.database.transaction(async transaction => {
                const record = await CommandResponseTextDbo
                    .findByPk(id, {
                        paranoid: false,
                        transaction,
                    });

                if (!record?.isSoftDeleted()) {
                    return null;
                }

                const parent = await CommandResponseDbo
                    .findOne({
                        where: {
                            id: record.commandResponseId,
                            commandName,
                            variant,
                        },
                        transaction,
                    });

                if (!parent) {
                    return null;
                }

                return toCommandResponseText(await this.restoreText(record, transaction));
            });
        } catch (error) {
            this.logger.error(`Error restoring the command text in database`, error);
        }

        return null;
    }

    /**
     * Soft-Delete the provided commands and their active texts under a shared deletion marker
     * @param commandResponseIds The command records to remove
     * @param transaction The transaction to run within
     * @returns count of command records removed
     */
    private async softDeleteWithTexts(commandResponseIds: number[], transaction: Transaction): Promise<number> {
        const deletionId = randomUUID();

        await CommandResponseTextDbo
            .update({
                deletionId,
            }, {
                where: {
                    commandResponseId: commandResponseIds,
                    deletedAt: null,
                },
                transaction,
            });

        await CommandResponseTextDbo
            .destroy({
                where: {
                    deletionId,
                },
                transaction,
            });

        await CommandResponseDbo
            .update({
                deletionId,
            }, {
                where: {
                    id: commandResponseIds,
                },
                transaction,
            });

        return CommandResponseDbo
            .destroy({
                where: {
                    deletionId,
                },
                transaction,
            });
    }

    /**
     * Restore the provided command text and clear its deletion marker
     * @param record The command text record to restore
     * @param transaction The transaction to run within
     * @returns The restored command text record
     */
    private async restoreText(record: CommandResponseTextDbo, transaction: Transaction): Promise<CommandResponseTextDbo> {
        await record.restore({
            transaction,
        });

        return record.update({
            deletionId: null,
        }, {
            transaction,
        });
    }

    /**
     * Restore the provided commands and their texts removed under the deletion marker, then clear the marker
     * @param deletionId The deletion marker to restore
     * @param commandResponseIds The command records to restore
     * @param transaction The transaction to run within
     */
    private async restoreDeletion(deletionId: string, commandResponseIds: number[], transaction: Transaction): Promise<void> {
        await CommandResponseDbo
            .restore({
                where: {
                    id: commandResponseIds,
                    deletionId,
                },
                transaction,
            });

        await CommandResponseTextDbo
            .restore({
                where: {
                    commandResponseId: commandResponseIds,
                    deletionId,
                },
                transaction,
            });

        await CommandResponseDbo
            .update({
                deletionId: null,
            }, {
                where: {
                    id: commandResponseIds,
                    deletionId,
                },
                transaction,
            });

        await CommandResponseTextDbo
            .update({
                deletionId: null,
            }, {
                where: {
                    commandResponseId: commandResponseIds,
                    deletionId,
                },
                transaction,
            });
    }
}
