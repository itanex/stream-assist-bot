import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { UniqueConstraintError } from 'sequelize';
import Database, { IDatabaseConfiguration } from '../../database/database';
import PhraseService, { PhraseGenericResult, PhraseInsertResult, PhraseUpdateResult } from './phrase.service';
import { mockLogger } from '../../tests/common.mocks';
import { defaultPhrases } from './default-phrases';
import { CommandPhrase } from '../../database';

jest.mock('./default-phrases', () => ({
    ...jest.requireActual('./default-phrases'),
    phraseFamilies: { testcommand: 'testcommand' },
}));

describe('Phrase.Service (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const defaultVariant = '';
    const validTemplate = 'Edited Template';
    const validName = 'ValidName';
    const testCommand = 'testcommand';
    const testVariants = [
        'variant1',
        'variant2',
    ];

    let subject: PhraseService;

    /** Utility to generate variant based template for testing */
    const templateFn = (cmd: string, variant: string = defaultVariant) => `test-template: ${cmd}.${variant}`;

    /** Utility to seed database with testing commands with variants */
    const seedVariants = async (cmd: string, variants: string[] = [defaultVariant]) => {
        await Promise.all(variants.map(async variant => CommandPhrase.addCommandTemplate(cmd, templateFn(cmd, variant), variant)));

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
    }, 120_000);

    afterAll(async () => {
        await container.stop();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Valid Database object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.initialize();
            subject = new PhraseService(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.clearAllMocks();
            await CommandPhrase.destroy({ where: {}, force: true });
            await subject.initialize();
        });

        describe('initialize()', () => {
            it('seeds row, gets installed default', async () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('about');

                // Assert
                expect(result).toBe(defaultPhrases.about);
            });
            it('should not seed twice', async () => {
                // Arrange - beforeEach()
                // Act
                await subject.initialize();
                await subject.setCommandTemplate('about', validTemplate);
                await subject.initialize();
                const result = subject.getCommandTemplate('about');
                const rowCount = await CommandPhrase.count({ where: { commandName: 'about' } });

                // Assert
                expect(result).toBe(validTemplate);
                expect(rowCount).toBe(1);
            });
        });
        describe('getCommandTemplate()', () => {
            it('should return the command (cache, variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandTemplate(testCommand, testVariants[1]);

                // Assert
                expect(result).toBe(templateFn(testCommand, testVariants[1]));
            });
            it('should return the command (cache, no-variant)', async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand);

                // Act
                const result = subject.getCommandTemplate(testCommand);

                // Assert
                expect(result).toBe(templateFn(testCommand));
            });

            it('should return undefined for no default variant name (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandTemplate(testCommand, '');

                // Assert
                expect(result).toBe(undefined);
            });
            it('should return undefined for unknown variant (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = subject.getCommandTemplate(testCommand, 'unknown');

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for invalid commandName (no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('');

                // Assert
                expect(result).toBe(undefined);
            });
            it('should return undefined for unknown command (no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('unknown');

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
        describe('setCommandTemplate()', () => {
            it('should return false with empty commandName', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandTemplate('', 'Valid template...');

                // Assert
                expect(result).toBe<PhraseGenericResult>('invalidInput');
            });
            it('should return false with empty template', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandTemplate(validName, '');

                // Assert
                expect(result).toBe<PhraseGenericResult>('invalidInput');
            });
            it('row updated and gets new template (variant)', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.setCommandTemplate(testCommand, validTemplate, testVariants[0]);
                const cached = subject.getCommandTemplate(testCommand, testVariants[0]);
                const rows = await CommandPhrase.findAll({ where: { commandName: testCommand } });

                const updated = rows.find(r => r.variant === testVariants[0]);
                const untouched = rows.find(r => r.variant === testVariants[1]);

                // Assert
                expect(result).toBe<PhraseUpdateResult>('updated');
                expect(cached).toBe(validTemplate);
                expect(rows.length).toBe(2);
                expect(updated?.template).toBe(validTemplate);
                expect(untouched?.template).toBe(templateFn(testCommand, testVariants[1]));
            });
            it('row updated and gets new template (no-variant)', async () => {
                // Arrange
                await seedVariants(testCommand);

                // Act
                const result = await subject.setCommandTemplate(testCommand, validTemplate);
                const cached = subject.getCommandTemplate(testCommand);
                const rows = await CommandPhrase.findAll({ where: { commandName: testCommand } });

                // Assert
                expect(result).toBe<PhraseUpdateResult>('updated');
                expect(cached).toBe(validTemplate);
                expect(rows.length).toBe(1);
                expect(rows[0].template).toBe(validTemplate);
            });
            it(`row update fails returning 'updateFailed'`, async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);
                const spy = jest.spyOn(CommandPhrase, 'updateCommandTemplate')
                    .mockResolvedValueOnce(false);

                // Act
                const result = await subject.setCommandTemplate(testCommand, validTemplate, testVariants[0]);

                // Assert
                expect(result).toBe<PhraseUpdateResult>('updateFailed');

                spy.mockRestore();
            });
            it('unknown key returns false, cache preserved', async () => {
                // Arrange
                const key = 'Unknown';
                const template = 'edited template...';

                // Act & Assert
                expect(await subject.setCommandTemplate(key, template)).toBe<PhraseUpdateResult>('notEditable');
                expect(subject.getCommandTemplate(key)).toBe(undefined);
            });
            it('known family with unrecognized variant returns notEditable', async () => {
                // Arrange
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.setCommandTemplate(testCommand, validTemplate, 'unknown');

                // Assert
                expect(result).toBe<PhraseUpdateResult>('notEditable');
            });
            it('invalid template (too short) rejected', async () => {
                // Arrange
                const badtemplate = 'BAD!';
                await seedVariants(testCommand);

                // Act
                const result = await subject.setCommandTemplate(testCommand, badtemplate);

                // Assert
                expect(result).toBe<PhraseUpdateResult>('invalidTemplate');
                expect(subject.getCommandTemplate(testCommand)).toBe(templateFn(testCommand));
            });
            it('non-validation error propagates', async () => {
                // Arrange
                await seedVariants(testCommand);
                const spy = jest.spyOn(CommandPhrase, 'updateCommandTemplate')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.setCommandTemplate(testCommand, 'valid template text'))
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
        describe('addCommandTemplate()', () => {
            it(`should return 'invalidInput' with empty commandName`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandTemplate('', validTemplate);

                // Assert
                expect(result).toBe<PhraseGenericResult>('invalidInput');
            });
            it(`should return 'invalidInput' with empty template`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandTemplate(validName, '');

                // Assert
                expect(result).toBe<PhraseGenericResult>('invalidInput');
            });
            it(`should return 'invalidInput' with empty variant`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.addCommandTemplate(validName, validTemplate, '');

                // Assert
                expect(result).toBe<PhraseGenericResult>('invalidInput');
            });
            it(`should return 'invalidCommandName' with an invalid command name`, async () => {
                // Arrange - beforeEach()
                // Act
                const unknownCommandName = 'UnknownCommandName';
                const result = await subject.addCommandTemplate(unknownCommandName, validTemplate, testVariants[0]);

                // Assert
                expect(result).toBe<PhraseInsertResult>('invalidCommandName');
            });
            it(`should return 'alreadyExists' for an existing command name`, async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand, testVariants);

                // Act
                const result = await subject.addCommandTemplate(testCommand, validTemplate, testVariants[0]);

                // Assert
                expect(result).toBe<PhraseInsertResult>('alreadyExists');
            });
            it(`row 'inserted' and gets new template`, async () => {
                // Arrange - beforeEach()
                await seedVariants(testCommand, [testVariants[0]]);

                // Act
                const initial = subject.getCommandTemplate(testCommand, testVariants[1]);
                const result = await subject.addCommandTemplate(testCommand, validTemplate, testVariants[1]);
                const cached = subject.getCommandTemplate(testCommand, testVariants[1]);
                const rows = await CommandPhrase.findAll({ where: { commandName: testCommand } });

                const inserted = rows.find(r => r.variant === testVariants[1]);
                const untouched = rows.filter(r => r.variant !== testVariants[1]);

                // Assert
                expect(result).toBe<PhraseInsertResult>('inserted');
                expect(initial).toBe(undefined);
                expect(cached).toBe(validTemplate);
                expect(rows.length).toBe(2);
                expect(inserted?.template).toBe(validTemplate);
                expect(untouched.length).toBe(1);
                expect(untouched.map(x => x.variant)).not.toContain(testVariants[1]);
            });
            it('invalid template (already exists) rejected', async () => {
                // Arrange
                const spy = jest.spyOn(CommandPhrase, 'addCommandTemplate')
                    .mockRejectedValueOnce(new UniqueConstraintError({} as any));

                // Act
                const result = await subject.addCommandTemplate(testCommand, templateFn(testCommand, testVariants[0]), testVariants[0]);

                // Assert
                expect(result).toBe<PhraseInsertResult>('alreadyExists');

                spy.mockRestore();
            });
            it('invalid template (dbo validation failed) rejected', async () => {
                // Arrange
                const badtemplate = 'BAD!';

                // Act
                const result = await subject.addCommandTemplate(testCommand, badtemplate, testVariants[0]);

                // Assert
                expect(result).toBe<PhraseInsertResult>('invalidTemplate');
            });
            it('non-validation error propagates', async () => {
                // Arrange
                await seedVariants(testCommand);
                const spy = jest.spyOn(CommandPhrase, 'addCommandTemplate')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.addCommandTemplate(testCommand, validTemplate, testVariants[0]))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
    });
});
