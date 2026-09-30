import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import CommandResponseRepository, { CommandResponse } from './command-response.repository.js';
import { mockError, mockLogger } from '../../tests/common.mocks.js';
import { CommandResponseDbo, CommandResponseTextDbo } from '../../database/index.js';

describe('CommandResponse.Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    /** Command Response seed records */
    const seedEntries: Record<string, Record<string, string[]>> = {
        'test-key-1': {
            '': ['test-value-1'],
        },
        'test-key-2': {
            'variant-1': ['test-variant-value-1'],
        },
        'test-key-3': {
            '': ['test-value-3'],
            'variant-1': ['test-variant-value-1'],
            'variant-2': ['test-variant-value-2'],
        },
    };

    const testVariants = [
        'variant-1',
        'variant-2',
    ];

    const testCommandDefaultVariant = 'test-key-1';
    const testCommandOnlyVariant = 'test-key-2';
    const testCommandAllVariants = 'test-key-3';

    const defaultVariant = '';
    const validText = 'test-extra-text-value';
    const newCommandName = 'new-command-name';
    const newVariantName = 'new-variant-name';

    let subject: CommandResponseRepository;

    beforeAll(async () => {
        try {
            container = await new PostgreSqlContainer('postgres:latest')
                .withExposedPorts({
                    container: 5432,
                    host: 33000,
                })
                .start();
        } catch (error: any) {
            const message = error instanceof Error ? error.message : String(error);

            if (message.includes('401') || message.includes('authentication required')) {
                throw new Error([
                    'Docker registry authentication failed while pulling the postgres image.',
                    'Local Docker Hub credentials are stale: run `docker login`, then rerun.',
                    `Original error: ${message}`,
                ].join(' '));
            }

            throw error;
        }

        databaseConfiguration = {
            database: container.getDatabase(),
            host: container.getHost(),
            username: container.getUsername(),
            password: container.getPassword(),
            port: container.getPort(),
        };
    }, 120_000);

    afterAll(async () => {
        await container.stop();
    });

    beforeEach(async () => {
        jest.resetAllMocks();
    });

    describe('Valid Database object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.initialize();
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(() => {
            jest.resetAllMocks();

            subject = new CommandResponseRepository(
                database,
                mockLogger,
            );
        });

        afterEach(async () => {
            await CommandResponseDbo.destroy({ where: {}, force: true });
        });

        describe('seed()', () => {
            it('seeds row, gets installed default', async () => {
                // Arrange - beforeEach()
                // Act
                await subject.seed(seedEntries);

                const actualByCommand = (await subject.findAll()).reduce<Record<string, Record<string, string[]>>>((acc, row) => {
                    acc[row.commandName] ??= {};
                    acc[row.commandName][row.variant] = row.texts.map(x => x.text);
                    return acc;
                }, {});

                // Assert
                expect(mockLogger.error).not.toHaveBeenCalled();
                expect(actualByCommand).toMatchObject(seedEntries);
            });

            it('should not seed twice, overriding existing keys', async () => {
                // Arrange - beforeEach()
                const newEntries: Record<string, Record<string, string[]>> = {
                    'test-key-1': { '': ['test-value-4'] },
                };

                // Act
                await subject.seed(seedEntries);
                await subject.seed(newEntries);

                const actualByCommand = (await subject.findAll()).reduce<Record<string, Record<string, string[]>>>((acc, row) => {
                    acc[row.commandName] ??= {};
                    acc[row.commandName][row.variant] = row.texts.map(x => x.text);
                    return acc;
                }, {});

                // Assert
                expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
                expect(mockLogger.error).not.toHaveBeenCalled();
                expect(actualByCommand).toMatchObject(seedEntries);
            });

            it('should log error when failing database', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'bulkCreate')
                    .mockImplementation(() => { throw mockError; });

                // Act
                await subject.seed(seedEntries);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));

                spy.mockRestore();
            });
        });

        describe('findAll()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should return all seeded commands', async () => {
                // Arrange
                const expectedLength = Object.entries(seedEntries)
                    .flatMap(([command, variants]) => Object
                        .entries(variants)
                        .map(([variant, texts]) => ({
                            command,
                            variant,
                            texts,
                        }))).length;

                // Act
                const results = await subject.findAll();

                // Assert
                expect(results.length).toBe(expectedLength);
            });
        });

        describe('getCommandVariants()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should return only the command default variant (command, no variant) ', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.getCommandVariants(testCommandDefaultVariant);

                // Assert
                expect(result).toEqual([defaultVariant]);
            });

            it('should return the command variants (command, expected variant)', async () => {
                // Arrange - beforeAll()
                const expectedVariants = Object.keys(seedEntries[testCommandAllVariants]);

                // Act
                const result = await subject.getCommandVariants(testCommandAllVariants);

                // Assert
                expect(result).toHaveLength(expectedVariants.length);
                expect(result).toEqual(expect.arrayContaining(expectedVariants));
            });

            it('should return empty set for invalid commandName (unknown command)', async () => {
                // Arrange - beforeEach()
                const unknownCommand = 'unknownCommand';

                // Act
                const result = await subject.getCommandVariants(unknownCommand);

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should return the found command (command, no variant) ', async () => {
                // Arrange - beforeEach()
                const expectedText = seedEntries[testCommandDefaultVariant][defaultVariant];

                // Act
                const result = await subject.getCommandText(testCommandDefaultVariant);

                // Assert
                expect(result).toEqual(
                    expect.arrayContaining(expectedText.map(x => expect.objectContaining({ text: x }))),
                );
            });

            it('should return the command (command, expected variant)', async () => {
                // Arrange
                const expectedText = seedEntries[testCommandOnlyVariant][testVariants[0]];

                // Act
                const result = await subject.getCommandText(testCommandOnlyVariant, testVariants[0]);

                // Assert
                expect(result).toEqual(
                    expect.arrayContaining(expectedText.map(x => expect.objectContaining({ text: x }))),
                );
            });

            it('should return empty set for no default variant name (command)', async () => {
                // Arrange - beforeAll()
                // Act
                const result = await subject.getCommandText(testCommandOnlyVariant);

                // Assert
                expect(result).toEqual([]);
            });

            it('should return empty set for unknown variant (variant)', async () => {
                // Arrange
                const unknownVariant = 'unknown';

                // Act
                const result = await subject.getCommandText(testCommandDefaultVariant, unknownVariant);

                // Assert
                expect(result).toEqual([]);
            });

            it('should return empty set for invalid commandName (unknown command)', async () => {
                // Arrange - beforeEach()
                const unknownCommand = 'unknownCommand';

                // Act
                const result = await subject.getCommandText(unknownCommand);

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('addCommand()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should insert and return the new record', async () => {
                // Arrange
                // Act
                const result = await subject.addCommand(newCommandName);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName: newCommandName,
                    variant: defaultVariant,
                    texts: [],
                }));
            });

            it('should restore previously deleted command', async () => {
                // Arrange
                const removed = await subject.removeCommand(testCommandDefaultVariant);

                // Act
                const result = await subject.addCommand(testCommandDefaultVariant);

                // Assert
                expect(removed).toBe(true);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandDefaultVariant,
                    variant: defaultVariant,
                    texts: [],
                }));
            });

            it('should return null when text record fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'findOrCreate')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.addCommand(testCommandDefaultVariant);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual(null);

                spy.mockRestore();
            });
        });

        describe('addCommandVariant()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should insert and return the new record', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandVariant(newCommandName, defaultVariant);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName: newCommandName,
                    variant: defaultVariant,
                    texts: [],
                }));
            });

            it('should restore previously deleted command variant', async () => {
                // Arrange
                const removed = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);

                // Act
                const result = await subject.addCommandVariant(testCommandAllVariants, testVariants[0]);

                // Assert
                expect(removed).toBe(true);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandAllVariants,
                    variant: testVariants[0],
                    texts: [],
                }));
            });

            it('should return null when text record fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'findOrCreate')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.addCommandVariant(newCommandName, defaultVariant);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual(null);

                spy.mockRestore();
            });
        });

        describe('addCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should insert and return the new record', async () => {
                // Arrange
                const commandName = 'test-command-name';
                const variant = 'test-variant';
                const text = 'test-command-text';

                // Act
                const result = await subject.addCommandText(commandName, text, variant);

                // Assert
                expect(result).toStrictEqual({
                    commandName,
                    variant,
                    texts: [{
                        text,
                        weight: 1,
                    }],
                });
            });

            it('should insert and return the new record (default variant)', async () => {
                // Arrange
                const commandName = 'test-command-name';
                const text = 'test-command-text';

                // Act
                const result = await subject.addCommandText(commandName, text);

                // Assert
                expect(result).toStrictEqual({
                    commandName,
                    variant: '',
                    texts: [{
                        text,
                        weight: 1,
                    }],
                });
            });

            it('should return null when parentCommand fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'findOrCreate')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.addCommandText(testCommandDefaultVariant, validText, defaultVariant);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual(null);

                spy.mockRestore();
            });

            it('should return null when text record fails to be created', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseTextDbo, 'create')
                    .mockImplementation(() => undefined);

                // Act
                const result = await subject.addCommandText(testCommandDefaultVariant, validText, defaultVariant);

                // Assert
                expect(mockLogger.warn)
                    .toHaveBeenCalledWith(expect.any(String));
                expect(result).toEqual(null);

                spy.mockRestore();
            });

            it('should return null when text record fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseTextDbo, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.addCommandText(testCommandDefaultVariant, validText, defaultVariant);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual(null);

                spy.mockRestore();
            });
        });

        describe('updateCommand', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should update the command name of the record', async () => {
                // Arrange
                // Act
                const result = await subject.updateCommand(testCommandDefaultVariant, newCommandName);

                // Assert
                expect(result).toEqual(expect.arrayContaining([{
                    commandName: newCommandName,
                    variant: defaultVariant,
                    originalName: testCommandDefaultVariant,
                }]));
            });

            it('should return null when command record fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'update')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.updateCommand(testCommandDefaultVariant, newCommandName);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual([]);

                spy.mockRestore();
            });
        });

        describe('updateCommandVariant', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should update the command variant name of the record', async () => {
                // Arrange
                // Act
                const result = await subject.updateCommandVariant(testCommandOnlyVariant, testVariants[0], newVariantName);

                // Assert
                expect(result).toStrictEqual(expect.objectContaining({
                    commandName: testCommandOnlyVariant,
                    variant: newVariantName,
                    originalVariant: testVariants[0],
                }));
            });

            it('should return null when command record fails', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'update')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.updateCommandVariant(testCommandDefaultVariant, testVariants[0], newCommandName);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
                expect(result).toEqual(null);

                spy.mockRestore();
            });
        });

        describe('removeCommand()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should remove the known command record', async () => {
                // Arrange - beforeEach()
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandDefaultVariant,
                    },
                });

                // Act
                const result = await subject.removeCommand(testCommandDefaultVariant);
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                    paranoid: false,
                });

                // Assert
                expect(mockLogger.error)
                    .not.toHaveBeenCalled();
                expect(result).toBe(true);
                // Validate child record deletes
                expect(texts.length).toBe(1);
                expect(texts.every(x => x.deletedAt !== null)).toBe(true);
            });

            it('should mark all command variants and texts with a shared deletion marker', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommand(testCommandAllVariants);
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                    },
                    paranoid: false,
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                    paranoid: false,
                });
                const [{ deletionId }] = commands;

                // Assert
                expect(result).toBe(true);
                expect(deletionId).toEqual(expect.any(String));
                expect(commands.every(x => x.deletionId === deletionId)).toBe(true);
                expect(texts.every(x => x.deletionId === deletionId)).toBe(true);
            });

            it('should NOT mark variants removed before the command', async () => {
                // Arrange
                await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const previous = await CommandResponseDbo.findOne({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                    paranoid: false,
                });

                // Act
                const result = await subject.removeCommand(testCommandAllVariants);
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                    },
                    paranoid: false,
                });
                const variantRecord = commands.find(x => x.variant === testVariants[0]);
                const defaultRecord = commands.find(x => x.variant === defaultVariant);

                // Assert
                expect(result).toBe(true);
                expect(previous?.deletionId).toEqual(expect.any(String));
                expect(variantRecord?.deletionId).toBe(previous?.deletionId);
                expect(defaultRecord?.deletionId).not.toBe(previous?.deletionId);
            });

            it('should NOT remove the unknown command record', async () => {
                // Arrange - beforeEach()
                const unknownCommand = 'unknown-command-name';

                // Act
                const result = await subject.removeCommand(unknownCommand);

                // Assert
                expect(mockLogger.error)
                    .not.toHaveBeenCalled();
                expect(result).toBe(false);
            });

            it('should log error when failing database (with rollback)', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'destroy')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.removeCommand(testCommandDefaultVariant);
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandDefaultVariant,
                    },
                    paranoid: false,
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                    paranoid: false,
                });

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));

                expect(result).toBe(false);
                // Validate Rollback effect
                expect(commands.length).toBe(1);
                expect(commands.every(x => x.deletedAt === null && x.deletionId === null)).toBe(true);
                expect(texts.length).toBe(1);
                expect(texts.every(x => x.deletedAt === null && x.deletionId === null)).toBe(true);

                spy.mockRestore();
            });
        });

        describe('removeCommandVariant()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should remove the known command variant record', async () => {
                // Arrange - beforeEach()
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                });

                // Act
                const result = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                    paranoid: false,
                });

                // Assert
                expect(mockLogger.error)
                    .not.toHaveBeenCalled();
                expect(result).toBe(true);
                // Validate child record deletes
                expect(texts.length).toBe(1);
                expect(texts.every(x => x.deletedAt !== null)).toBe(true);
            });

            it('should mark the command variant and texts with a shared deletion marker', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const command = await CommandResponseDbo.findOne({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                    paranoid: false,
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: command?.id,
                    },
                    paranoid: false,
                });

                // Assert
                expect(result).toBe(true);
                expect(command?.deletionId).toEqual(expect.any(String));
                expect(texts.every(x => x.deletionId === command?.deletionId)).toBe(true);
            });

            it('should NOT mark texts removed before the command variant', async () => {
                // Arrange
                await subject.addCommandText(testCommandAllVariants, validText, testVariants[0]);
                await CommandResponseTextDbo.destroy({
                    where: {
                        text: validText,
                    },
                });

                // Act
                const result = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const command = await CommandResponseDbo.findOne({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                    paranoid: false,
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: command?.id,
                    },
                    paranoid: false,
                });
                const previousText = texts.find(x => x.text === validText);
                const currentTexts = texts.filter(x => x.text !== validText);

                // Assert
                expect(result).toBe(true);
                expect(previousText?.deletionId).toBeNull();
                expect(currentTexts.length).toBe(1);
                expect(currentTexts.every(x => x.deletionId === command?.deletionId)).toBe(true);
            });

            it('should NOT remove the unknown command variant record', async () => {
                // Arrange - beforeEach()
                const unknownVariant = 'unknown-variant-name';

                // Act
                const result = await subject.removeCommandVariant(testCommandDefaultVariant, unknownVariant);

                // Assert
                expect(mockLogger.error)
                    .not.toHaveBeenCalled();
                expect(result).toBe(false);
            });

            it('should log error when failing database (with rollback)', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'destroy')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                    paranoid: false,
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                    paranoid: false,
                });

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));

                expect(result).toBe(false);
                // Validate Rollback effect
                expect(commands.length).toBe(1);
                expect(commands.every(x => x.deletedAt === null && x.deletionId === null)).toBe(true);
                expect(texts.length).toBe(1);
                expect(texts.every(x => x.deletedAt === null && x.deletionId === null)).toBe(true);

                spy.mockRestore();
            });
        });

        describe('removeCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });
            // TODO
        });

        describe('restoreCommand()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should restore command with variants and text responses', async () => {
                // Arrange
                const expected = Object.entries(seedEntries[testCommandAllVariants])
                    .map(([variant, texts]) => ({
                        commandName: testCommandAllVariants,
                        variant,
                        texts: expect.arrayContaining(
                            texts.map(text => expect.objectContaining({ text })),
                        ),
                    } as CommandResponse));
                const removed = await subject.removeCommand(testCommandAllVariants);

                // Act
                const result = await subject.restoreCommand(testCommandAllVariants);

                // Assert
                expect(removed).toBe(true);
                expect(result).toStrictEqual(expected);
            });

            it('should restore only the variants removed with the command', async () => {
                // Arrange
                await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const removed = await subject.removeCommand(testCommandAllVariants);

                // Act
                const result = await subject.restoreCommand(testCommandAllVariants);
                const previous = await CommandResponseDbo.findOne({
                    where: {
                        commandName: testCommandAllVariants,
                        variant: testVariants[0],
                    },
                    paranoid: false,
                });

                // Assert
                expect(removed).toBe(true);
                expect(result.map(x => x.variant)).toEqual(expect.arrayContaining([defaultVariant, testVariants[1]]));
                expect(result.map(x => x.variant)).not.toContain(testVariants[0]);
                expect(previous?.deletedAt).not.toBeNull();
            });

            it('should NOT restore texts removed before the command', async () => {
                // Arrange
                await subject.addCommandText(testCommandAllVariants, validText, defaultVariant);
                await CommandResponseTextDbo.destroy({
                    where: {
                        text: validText,
                    },
                });
                const removed = await subject.removeCommand(testCommandAllVariants);

                // Act
                const result = await subject.restoreCommand(testCommandAllVariants);
                const previousText = await CommandResponseTextDbo.findOne({
                    where: {
                        text: validText,
                    },
                    paranoid: false,
                });
                const defaultRecord = result.find(x => x.variant === defaultVariant);

                // Assert
                expect(removed).toBe(true);
                expect(previousText?.deletedAt).not.toBeNull();
                expect(defaultRecord?.texts.map(x => x.text)).toEqual(seedEntries[testCommandAllVariants][defaultVariant]);
            });

            it('should clear the deletion marker on restored records', async () => {
                // Arrange
                await subject.removeCommand(testCommandAllVariants);

                // Act
                await subject.restoreCommand(testCommandAllVariants);
                const commands = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                    },
                });
                const texts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: commands.map(x => x.id),
                    },
                });

                // Assert
                expect(commands.every(x => x.deletionId === null)).toBe(true);
                expect(texts.every(x => x.deletionId === null)).toBe(true);
            });

            it('should exit early if no records are removed', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.restoreCommand(testCommandAllVariants);

                // Assert
                expect(mockLogger.error).not.toHaveBeenCalled();

                expect(result).toEqual([]);
            });

            it('should log error when failing database', async () => {
                // Arrange
                await subject.removeCommand(testCommandAllVariants);
                const spy = jest.spyOn(CommandResponseDbo, 'restore')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.restoreCommand(testCommandAllVariants);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));

                expect(result).toEqual([]);

                spy.mockRestore();
            });
        });

        describe('restoreCommandVariant()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            it('should restore command variant and text responses', async () => {
                // Arrange
                const expected = {
                    commandName: testCommandAllVariants,
                    variant: testVariants[0],
                    texts: expect.arrayContaining(
                        seedEntries[testCommandAllVariants][testVariants[0]]
                            .map(x => expect.objectContaining({ text: x })),
                    ),
                };
                const removed = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);

                // Assert
                expect(removed).toBe(true);
                expect(result).toStrictEqual(expected);
            });

            it('should NOT restore texts removed before the command variant', async () => {
                // Arrange
                await subject.addCommandText(testCommandAllVariants, validText, testVariants[0]);
                await CommandResponseTextDbo.destroy({
                    where: {
                        text: validText,
                    },
                });
                const removed = await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);
                const previousText = await CommandResponseTextDbo.findOne({
                    where: {
                        text: validText,
                    },
                    paranoid: false,
                });

                // Assert
                expect(removed).toBe(true);
                expect(previousText?.deletedAt).not.toBeNull();
                expect(result?.texts.map(x => x.text)).toEqual(seedEntries[testCommandAllVariants][testVariants[0]]);
            });

            it('should restore only the command variant when removed with the command', async () => {
                // Arrange
                const removed = await subject.removeCommand(testCommandAllVariants);

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);
                const others = await CommandResponseDbo.findAll({
                    where: {
                        commandName: testCommandAllVariants,
                    },
                    paranoid: false,
                });
                const otherTexts = await CommandResponseTextDbo.findAll({
                    where: {
                        commandResponseId: others
                            .filter(x => x.variant !== testVariants[0])
                            .map(x => x.id),
                    },
                    paranoid: false,
                });

                // Assert
                expect(removed).toBe(true);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandAllVariants,
                    variant: testVariants[0],
                }));
                expect(others
                    .filter(x => x.variant !== testVariants[0])
                    .every(x => x.deletedAt !== null)).toBe(true);
                expect(otherTexts.every(x => x.deletedAt !== null)).toBe(true);
            });

            it('should NOT restore texts of an active command variant', async () => {
                // Arrange
                await subject.addCommandText(testCommandAllVariants, validText, testVariants[0]);
                await CommandResponseTextDbo.destroy({
                    where: {
                        text: validText,
                    },
                });

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);
                const previousText = await CommandResponseTextDbo.findOne({
                    where: {
                        text: validText,
                    },
                    paranoid: false,
                });

                // Assert
                expect(previousText?.deletedAt).not.toBeNull();
                expect(result?.texts.map(x => x.text)).toEqual(seedEntries[testCommandAllVariants][testVariants[0]]);
            });

            it('should exit early if no record is restored', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponseDbo, 'findOne')
                    .mockImplementation(async () => null);

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);

                // Assert
                expect(mockLogger.error).not.toHaveBeenCalled();

                expect(result).toEqual(null);

                spy.mockRestore();
            });

            it('should log error when failing database', async () => {
                // Arrange
                await subject.removeCommandVariant(testCommandAllVariants, testVariants[0]);
                const spy = jest.spyOn(CommandResponseDbo, 'restore')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.restoreCommandVariant(testCommandAllVariants, testVariants[0]);

                // Assert
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(expect.any(String), expect.any(Error));

                expect(result).toEqual(null);

                spy.mockRestore();
            });
        });

        describe('restoreCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponseDbo.destroy({ where: {}, force: true });
            });

            it('should restore command (default, no-variant)', async () => {
                // Arrange
                // const removed = await subject.removeCommandText(testCommandDefaultVariant);

                // Act
                const [restored, result] = await subject.restoreCommandText(testCommandDefaultVariant);

                // Assert
                expect(restored).toBe(true);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandDefaultVariant,
                    variant: '',
                }));
            });

            it('should restore command (command, variant)', async () => {
                // Arrange
                const removed = await subject.removeCommandText(testCommandOnlyVariant, testVariants[0]);

                // Act
                const [restored, result] = await subject.restoreCommandText(testCommandOnlyVariant, testVariants[0]);

                // Assert
                expect(restored).toBe(true);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandOnlyVariant,
                    variant: testVariants[0],
                }));
            });

            it('should not restore existing command (default, no-variant)', async () => {
                // Arrange
                // Act
                const [restored, result] = await subject.restoreCommandText(testCommandDefaultVariant);

                // Assert
                expect(restored).toBe(false);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandDefaultVariant,
                    variant: '',
                }));
            });

            it('should not restore existing command (command, variant)', async () => {
                // Arrange - beforeEach()
                // Act
                const [restored, result] = await subject.restoreCommandText(testCommandOnlyVariant, testVariants[0]);

                // Assert
                expect(restored).toBe(false);
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandOnlyVariant,
                    variant: testVariants[0],
                }));
            });

            it('should no-op with unknown command (command, no-variant)', async () => {
                // Arrange - beforeEach()
                const commandName = 'unknownCommand';

                // Act
                const [restored, result] = await subject.restoreCommandText(commandName);

                // Assert
                expect(restored).toBe(false);
                expect(result).toBe(null);
            });

            it('should no-op with unknown command (command, variant)', async () => {
                // Arrange - beforeEach()
                const variant = 'unknownCommand';

                // Act
                const [restored, result] = await subject.restoreCommandText(testCommandDefaultVariant, variant);

                // Assert
                expect(restored).toBe(false);
                expect(result).toBe(null);
            });
        });
    });
});
