import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import CommandResponseRepository from './command-response.repository.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { CommandResponse } from '../../database/index.js';

describe('CommandResponse.Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    /** Command Response seed records */
    const seedEntries: Record<string, Record<string, string>> = {
        'test-key-1': {
            '': 'test-value-1',
        },
        'test-key-2': {
            'variant-1': 'test-variant-value-1',
        },
        'test-key-3': {
            '': 'test-value-3',
            'variant-1': 'test-variant-value-1',
            'variant-2': 'test-variant-value-2',
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
    const validText = 'Edited Text';

    let subject: CommandResponseRepository;

    beforeAll(async () => {
        try {
            container = await new PostgreSqlContainer('postgres:latest').start();
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

        beforeEach(async () => {
            jest.resetAllMocks();

            await CommandResponse.destroy({ where: {}, force: true });
            subject = new CommandResponseRepository(mockLogger);
        });

        describe('seed()', () => {
            it('seeds row, gets installed default', async () => {
                // Arrange - beforeEach()
                // Act
                await subject.seed(seedEntries);

                const actualByCommand = (await subject.findAll()).reduce<Record<string, Record<string, string>>>((acc, row) => {
                    acc[row.commandName] ??= {};
                    acc[row.commandName][row.variant] = row.text;
                    return acc;
                }, {});

                // Assert
                expect(actualByCommand).toMatchObject(seedEntries);
            });

            it('should not seed twice, overriding existing keys', async () => {
                // Arrange - beforeEach()
                const newEntries: Record<string, Record<string, string>> = {
                    'test-key-1': { '': 'test-value-4' },
                };

                // Act
                await subject.seed(seedEntries);
                await subject.seed(newEntries);

                const actualByCommand = (await subject.findAll()).reduce<Record<string, Record<string, string>>>((acc, row) => {
                    acc[row.commandName] ??= {};
                    acc[row.commandName][row.variant] = row.text;
                    return acc;
                }, {});

                // Assert
                expect(actualByCommand).toMatchObject(seedEntries);
            });

            it('should not overwrite existing values', async () => {
                // Arrange - beforeEach()
                // Act
                await subject.seed(seedEntries);
                await subject.updateCommandText('test-key-1', validText);
                await subject.seed(seedEntries);

                const actualByCommand = (await subject.findAll()).reduce<Record<string, Record<string, string>>>((acc, row) => {
                    acc[row.commandName] ??= {};
                    acc[row.commandName][row.variant] = row.text;
                    return acc;
                }, {});

                // Assert
                expect(actualByCommand).toEqual(expect.objectContaining({
                    ...seedEntries,
                    'test-key-1': { '': validText },
                }));
            });
        });

        describe('getCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponse.destroy({ where: {}, force: true });
            });

            it('should return the found command (command, no variant) ', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.getCommandText(testCommandDefaultVariant);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandDefaultVariant,
                    variant: defaultVariant,
                }));
            });

            it('should return the command (command, expected variant)', async () => {
                // Arrange - beforeAll()
                // Act
                const result = await subject.getCommandText(testCommandOnlyVariant, testVariants[0]);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName: testCommandOnlyVariant,
                    variant: testVariants[0],
                }));
            });

            it('should return null for no default variant name (command)', async () => {
                // Arrange - beforeAll()
                // Act
                const result = await subject.getCommandText(testCommandOnlyVariant);

                // Assert
                expect(result).toBe(null);
            });

            it('should return null for unknown variant (variant)', async () => {
                // Arrange
                const unknownVariant = 'unknown';

                // Act
                const result = await subject.getCommandText(testCommandDefaultVariant, unknownVariant);

                // Assert
                expect(result).toBe(null);
            });

            it('should return null for invalid commandName (unknown command)', async () => {
                // Arrange - beforeEach()
                const unknownCommand = 'unknownCommand';

                // Act
                const result = await subject.getCommandText(unknownCommand);

                // Assert
                expect(result).toBe(null);
            });
        });

        describe('getCommandVariants()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponse.destroy({ where: {}, force: true });
            });

            it('should return only the command default variant (command, no variant) ', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.getCommandVariants(testCommandDefaultVariant);

                // Assert
                expect(result).toContainEqual(expect.objectContaining({
                    commandName: testCommandDefaultVariant,
                    variant: defaultVariant,
                }));
            });

            it('should return the command variants (command, expected variant)', async () => {
                // Arrange - beforeAll()
                // Act
                const result = await subject.getCommandVariants(testCommandAllVariants);

                // Assert
                expect(result).toContainEqual(expect.objectContaining({
                    commandName: testCommandAllVariants,
                    variant: defaultVariant,
                }));
                expect(result).toContainEqual(expect.objectContaining({
                    commandName: testCommandAllVariants,
                    variant: testVariants[0],
                }));
                expect(result).toContainEqual(expect.objectContaining({
                    commandName: testCommandAllVariants,
                    variant: testVariants[1],
                }));
            });

            it('should return null for no default variant name (command)', async () => {
                // Arrange - beforeAll()
                // Act
                const result = await subject.getCommandText(testCommandOnlyVariant);

                // Assert
                expect(result).toBe(null);
            });

            it('should return null for unknown variant (variant)', async () => {
                // Arrange
                const unknownVariant = 'unknown';

                // Act
                const result = await subject.getCommandText(testCommandDefaultVariant, unknownVariant);

                // Assert
                expect(result).toBe(null);
            });

            it('should return null for invalid commandName (unknown command)', async () => {
                // Arrange - beforeEach()
                const unknownCommand = 'unknownCommand';

                // Act
                const result = await subject.getCommandText(unknownCommand);

                // Assert
                expect(result).toBe(null);
            });
        });

        describe('addCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponse.destroy({ where: {}, force: true });
            });

            it('should insert and return the new record', async () => {
                // Arrange - beforeEach()
                const commandName = 'test-command-name';
                const variant = 'test-variant';
                const text = 'test-command-text';

                // Act
                const result = await subject.addCommandText(commandName, text, variant);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName,
                    variant,
                    text,
                }));
            });

            it('should insert and return the new record (default variant)', async () => {
                // Arrange - beforeEach()
                const commandName = 'test-command-name';
                const text = 'test-command-text';

                // Act
                const result = await subject.addCommandText(commandName, text);

                // Assert
                expect(result).toEqual(expect.objectContaining({
                    commandName,
                    variant: '',
                    text,
                }));
            });
        });

        describe('removeCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponse.destroy({ where: {}, force: true });
            });

            it.each`
                input    | commandName                  | isRemoved
                ${''}    | ${testCommandDefaultVariant} | ${true}
                ${'not'} | ${'unknownCommand'}          | ${false}
            `('should $input remove the command record (no-variant)', async ({ input, commandName, isRemoved }: { input: string, commandName: string, isRemoved: boolean }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText(commandName);

                // Assert
                expect(result).toBe(isRemoved);
            });

            it.each`
                input    | commandName               | variant             | isRemoved
                ${''}    | ${testCommandOnlyVariant} | ${testVariants[0]}  | ${true}
                ${'not'} | ${testCommandOnlyVariant} | ${'unknownVariant'} | ${false}
            `('should $input remove the command record (variant)', async ({ input, commandName, variant, isRemoved }: { input: string, commandName: string, variant: string, isRemoved: boolean }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText(commandName, variant);

                // Assert
                expect(result).toBe(isRemoved);
            });
        });

        describe('restoreCommandText()', () => {
            beforeEach(async () => {
                await subject.seed(seedEntries);
            });

            afterEach(async () => {
                await CommandResponse.destroy({ where: {}, force: true });
            });

            it('should restore command (default, no-variant)', async () => {
                // Arrange
                const removed = await subject.removeCommandText(testCommandDefaultVariant);

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
