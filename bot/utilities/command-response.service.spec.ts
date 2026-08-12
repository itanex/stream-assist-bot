import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { UniqueConstraintError } from 'sequelize';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import {
    type CommandTextValidationResult,
    type CommandTextInsertResult,
    type CommandTextUpdateResult,
    type CommandTextRemoveResult,
    type CommandTextRestoreResult,
} from './command-response.service.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { CommandResponse } from '../../database/index.js';

type CommandResponseServiceModule = typeof import('./command-response.service.js');
type MockDefaultResponses = { testResponse: string };
type MockCommandFamilies = { testCommand: string };

jest.unstable_mockModule('./default-responses', () => ({
    __esModule: true,
    CommandFamilies: { testCommand: 'testcommand' },
    defaultResponses: { testResponse: 'Test about response' },
}));

describe('CommandResponse.Service (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const defaultVariant = '';
    const validText = 'Edited Text';
    const validName = 'ValidName';
    const testCommand = 'testCommand';
    const testVariants = [
        'variant1',
        'variant2',
    ];

    let CommandResponseService: CommandResponseServiceModule['default'];
    let CommandFamilies: jest.MockedObject<MockCommandFamilies>;
    let defaultResponses: jest.MockedObject<MockDefaultResponses>;

    let subject: InstanceType<CommandResponseServiceModule['default']>;

    /** Utility to generate variant based text for testing */
    const textFn = (cmd: string, variant: string = defaultVariant) => `test-text: ${cmd}.${variant}`;

    /** Utility to seed database with testing commands with variants */
    const seedVariants = async (cmd: string, variants: string[] = [defaultVariant]) => {
        await Promise.all(variants.map(async variant => CommandResponse.addCommandText(cmd, textFn(cmd, variant), variant)));

        await subject.initialize();
    };

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

        ({ default: CommandResponseService } = await import('./command-response.service.js'));

        ({
            defaultResponses,
            CommandFamilies,
        } = await import('./default-responses.js') as unknown as {
            defaultResponses: MockDefaultResponses;
            CommandFamilies: MockCommandFamilies;
        });
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
            subject = new CommandResponseService(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            await CommandResponse.destroy({ where: {}, force: true });
            await subject.initialize();
        });

        describe('initialize()', () => {
            it('seeds row, gets installed default', async () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText('testResponse');

                // Assert
                expect(result).toBe(defaultResponses.testResponse);
            });
            it('should not seed twice', async () => {
                // Arrange - beforeEach()
                // Act
                await subject.initialize();
                await subject.setCommandText('testResponse', validText);
                await subject.initialize();
                const result = subject.getCommandText('testResponse');
                const rowCount = await CommandResponse.count({ where: { commandName: 'testResponse' } });

                // Assert
                expect(result).toBe(validText);
                expect(rowCount).toBe(1);
            });
        });
        describe('getCommandText()', () => {
            it('should return the command (cache, variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandText(testCommand, testVariants[1]);

                // Assert
                expect(result).toBe(textFn(testCommand, testVariants[1]));
            });
            it('should return the command (cache, no-variant)', async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand);

                // Act
                const result = subject.getCommandText(testCommand);

                // Assert
                expect(result).toBe(textFn(testCommand));
            });

            it('should return undefined for no default variant name (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandText(testCommand, '');

                // Assert
                expect(result).toBe(undefined);
            });
            it('should return undefined for unknown variant (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandText(testCommand, 'unknown');

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for invalid commandName (no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText('');

                // Assert
                expect(result).toBe(undefined);
            });
            it('should return undefined for unknown command (no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText('unknown');

                // Assert
                expect(result).toBe(undefined);
            });
        });
        describe('getCommandVariants()', () => {
            it('should return the command variants (cache)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandVariants(testCommand);

                // Assert
                expect(result.length).toBe(testVariants.length);
                expect(result).toEqual(expect.arrayContaining(testVariants));
            });
            it('should return the command variants (cache) (no-variant)', async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand);

                // Act
                const result = subject.getCommandVariants(testCommand);

                // Assert
                expect(result).toStrictEqual<string[]>([defaultVariant]);
            });
            it('should return empty collection for invalid commandName (empty string)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandVariants('');

                // Assert
                expect(result).toEqual<string[]>([]);
            });
            it('should return empty collection for unknown command', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandVariants('unknown');

                // Assert
                expect(result).toEqual<string[]>([]);
            });
            it('does not include variants from a command name that is a prefix match', async () => {
                // Arrange
                const similarCommand = `${testCommand}Similar`;
                const similarVariants = testVariants.map(x => `${x}Similar`);
                await seedVariants(testCommand, testVariants);
                await seedVariants(similarCommand, similarVariants);

                // Act
                const result = subject.getCommandVariants(testCommand);

                // Assert
                expect(result.length).toBe(testVariants.length);
                expect(result).toEqual(expect.arrayContaining(testVariants));
            });
        });
        describe('setCommandText()', () => {
            it('should return false with empty commandName', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandText('', 'Valid text...');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('should return false with empty text', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandText(validName, '');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('row updated and gets new text (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.setCommandText(testCommand, validText, testVariants[0]);
                const cached = subject.getCommandText(testCommand, testVariants[0]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });

                const updated = rows.find(r => r.variant === testVariants[0]);
                const untouched = rows.find(r => r.variant === testVariants[1]);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('updated');
                expect(cached).toBe(validText);
                expect(rows.length).toBe(2);
                expect(updated?.text).toBe(validText);
                expect(untouched?.text).toBe(textFn(testCommand, testVariants[1]));
            });
            it('row updated and gets new text (no-variant)', async () => {
                // Arrange
                await seedVariants(testCommand);

                // Act
                const result = await subject.setCommandText(testCommand, validText);
                const cached = subject.getCommandText(testCommand);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('updated');
                expect(cached).toBe(validText);
                expect(rows.length).toBe(1);
                expect(rows[0].text).toBe(validText);
            });
            it(`row update fails returning 'updateFailed'`, async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);
                const spy = jest.spyOn(CommandResponse, 'updateCommandText')
                    .mockResolvedValueOnce(false);

                // Act
                const result = await subject.setCommandText(testCommand, validText, testVariants[0]);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('updateFailed');

                spy.mockRestore();
            });
            it('unknown key returns false, cache preserved', async () => {
                // Arrange
                const key = 'Unknown';
                const text = 'edited text...';

                // Act & Assert
                expect(await subject.setCommandText(key, text)).toBe<CommandTextUpdateResult>('notEditable');
                expect(subject.getCommandText(key)).toBe(undefined);
            });
            it('known family with unrecognized variant returns notEditable', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.setCommandText(testCommand, validText, 'unknown');

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('notEditable');
            });
            it('invalid text (too short) rejected', async () => {
                // Arrange
                const badtext = 'BAD!';
                await seedVariants(testCommand);

                // Act
                const result = await subject.setCommandText(testCommand, badtext);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('invalidText');
                expect(subject.getCommandText(testCommand)).toBe(textFn(testCommand));
            });
            it('non-validation error propagates', async () => {
                // Arrange
                await seedVariants(testCommand);
                const spy = jest.spyOn(CommandResponse, 'updateCommandText')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.setCommandText(testCommand, 'valid text...'))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
        describe('isValidCommandName()', () => {
            it(`should return true for commandName that exists`, () => {
                // Arrange
                // Act
                const result = subject.isValidCommandName(testCommand);
                // Assert
                expect(result).toBe(true);
            });
            it(`should return false for commandName that does not exists`, () => {
                // Arrange
                // Act
                const result = subject.isValidCommandName('UknownCommand');
                // Assert
                expect(result).toBe(false);
            });
        });
        describe('addCommandText()', () => {
            it(`should return 'invalidInput' with empty commandName`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandText('', validText);

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it(`should return 'invalidInput' with empty text`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandText(validName, '');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it(`should return 'invalidInput' with empty variant`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandText(validName, validText, '');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it(`should return 'invalidCommandName' with an invalid command name`, async () => {
                // Arrange - beforeEach()
                // Act
                const unknownCommandName = 'UnknownCommandName';
                const result = await subject.addCommandText(unknownCommandName, validText, testVariants[0]);

                // Assert
                expect(result).toBe<CommandTextInsertResult>('invalidCommandName');
            });
            it(`should return 'alreadyExists' for an existing command name`, async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.addCommandText(testCommand, validText, testVariants[0]);

                // Assert
                expect(result).toBe<CommandTextInsertResult>('alreadyExists');
            });
            it(`row 'inserted' and gets new text`, async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand, [testVariants[0]]);

                // Act
                const initial = subject.getCommandText(testCommand, testVariants[1]);
                const result = await subject.addCommandText(testCommand, validText, testVariants[1]);
                const cached = subject.getCommandText(testCommand, testVariants[1]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });

                const inserted = rows.find(r => r.variant === testVariants[1]);
                const untouched = rows.filter(r => r.variant !== testVariants[1]);

                // Assert
                expect(result).toBe<CommandTextInsertResult>('inserted');
                expect(initial).toBe(undefined);
                expect(cached).toBe(validText);
                expect(rows.length).toBe(2);
                expect(inserted?.text).toBe(validText);
                expect(untouched.length).toBe(1);
                expect(untouched.map(x => x.variant)).not.toContain(testVariants[1]);
            });
            it(`row 'inserted' and gets new text (restored)`, async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand, testVariants);

                // Act
                const sideeffect = await subject.removeCommandText(testCommand, testVariants[1]);
                const initial = subject.getCommandText(testCommand, testVariants[1]);
                const result = await subject.addCommandText(testCommand, validText, testVariants[1]);
                const cached = subject.getCommandText(testCommand, testVariants[1]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });

                const inserted = rows.find(r => r.variant === testVariants[1]);
                const untouched = rows.filter(r => r.variant !== testVariants[1]);

                // Assert
                expect(sideeffect).toBe<CommandTextRemoveResult>('removed');
                expect(result).toBe<CommandTextInsertResult>('inserted');
                expect(initial).toBe(undefined);
                expect(cached).toBe(validText);
                expect(rows.length).toBe(2);
                expect(inserted?.text).toBe(validText);
                expect(untouched.length).toBe(1);
                expect(untouched.map(x => x.variant)).not.toContain(testVariants[1]);
            });
            it('invalid text (already exists) rejected', async () => {
                // Arrange
                const spy = jest.spyOn(CommandResponse, 'addCommandText')
                    .mockRejectedValueOnce(new UniqueConstraintError({} as any));

                // Act
                const result = await subject.addCommandText(testCommand, textFn(testCommand, testVariants[0]), testVariants[0]);

                // Assert
                expect(result).toBe<CommandTextInsertResult>('alreadyExists');

                spy.mockRestore();
            });
            it('invalid text (dbo validation failed) rejected', async () => {
                // Arrange
                const badtext = 'BAD!';

                // Act
                const result = await subject.addCommandText(testCommand, badtext, testVariants[0]);

                // Assert
                expect(result).toBe<CommandTextInsertResult>('invalidText');
            });
            it('non-validation error propagates', async () => {
                // Arrange
                await seedVariants(testCommand);
                const spy = jest.spyOn(CommandResponse, 'addCommandText')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.addCommandText(testCommand, validText, testVariants[0]))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
        describe('removeCommandText()', () => {
            it('should return false with empty commandName', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText('', 'ValidVariant');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('should return invalidInput with empty variant', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText(validName);

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('command/variant not in cache returns notFound', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.removeCommandText(testCommand, 'unknown');

                // Assert
                expect(result).toBe<CommandTextRemoveResult>('notFound');
            });
            it('should remove record from database records and cache', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.removeCommandText(testCommand, testVariants[0]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });
                const variants = subject.getCommandVariants(testCommand);

                // Assert
                expect(result).toBe<CommandTextRemoveResult>('removed');
                expect(rows.length).toBe(testVariants.length - 1);
                expect(rows).not.toContainEqual(expect.objectContaining({ commandName: testCommand, variant: testVariants[0] }));
                expect(variants.length).toBe(testVariants.length - 1);
                expect(variants).not.toContain(testVariants[0]);
            });
            it('should not have removed valid command/variant from database or cache', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);
                const spy = jest.spyOn(CommandResponse, 'removeCommandText')
                    .mockResolvedValue(false);

                // Act
                const result = await subject.removeCommandText(testCommand, testVariants[0]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });
                const variants = subject.getCommandVariants(testCommand);

                // Assert
                expect(result).toBe<CommandTextRemoveResult>('removeFailed');
                expect(rows.length).toBe(testVariants.length);
                expect(rows).toContainEqual(expect.objectContaining({ commandName: testCommand, variant: testVariants[0] }));
                expect(variants.length).toBe(testVariants.length);
                expect(variants).toContain(testVariants[0]);

                spy.mockRestore();
            });
            it('thrown error propagates', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);
                const spy = jest.spyOn(CommandResponse, 'removeCommandText')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.removeCommandText(testCommand, testVariants[0]))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
        describe('restoreCommandText()', () => {
            it('should return false with empty commandName', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.restoreCommandText('', 'ValidVariant');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('should return invalidInput with empty variant', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.restoreCommandText(validName);

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });
            it('should return alreadyActive when command/variant is present in cache', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.restoreCommandText(testCommand, testVariants[0]);
                const variants = subject.getCommandVariants(testCommand);

                // Assert
                expect(result).toBe<CommandTextRestoreResult>('alreadyActive');
                expect(variants.length).toBe(testVariants.length);
                expect(variants).toContain(testVariants[0]);
            });
            it('should restore record in database records and cache (restored)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const removed = await subject.removeCommandText(testCommand, testVariants[0]);
                const result = await subject.restoreCommandText(testCommand, testVariants[0]);
                const rows = await CommandResponse.findAll({ where: { commandName: testCommand } });
                const variants = subject.getCommandVariants(testCommand);

                // Assert
                expect(removed).toBe<CommandTextRemoveResult>('removed');
                expect(result).toBe<CommandTextRestoreResult>('restored');
                expect(rows.length).toBe(testVariants.length);
                expect(rows).toContainEqual(expect.objectContaining({ commandName: testCommand, variant: testVariants[0] }));
                expect(variants.length).toBe(testVariants.length);
                expect(variants).toContain(testVariants[0]);
            });
            it('should return notFound when command/variant is not in the database or cache', async () => {
                // Arrange
                await seedVariants(testCommand, [testVariants[0]]);

                // Act
                const result = await subject.restoreCommandText(testCommand, testVariants[1]);
                const variants = subject.getCommandVariants(testCommand);

                // Assert
                expect(result).toBe<CommandTextRestoreResult>('notFound');
                expect(variants.length).toBe(1);
                expect(variants).not.toContain(testVariants[1]);
            });
            it('thrown error propagates', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);
                const spy = jest.spyOn(CommandResponse, 'restoreCommandText')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                const removed = await subject.removeCommandText(testCommand, testVariants[0]);
                await expect(subject.restoreCommandText(testCommand, testVariants[0]))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
    });
});
