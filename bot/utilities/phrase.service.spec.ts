import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import Database, { IDatabaseConfiguration } from '../../database/database';
import PhraseService, { PhraseUpdateResult } from './phrase.service';
import { mockLogger } from '../../tests/common.mocks';
import { defaultPhrases } from './default-phrases';
import { CommandPhrase } from '../../database';

describe('Phrase.Service (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    let subject: PhraseService;

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
                // Arrange
                const editedTemplate = 'edited template';

                // Act
                await subject.initialize();
                await subject.setCommandTemplate('about', editedTemplate);
                await subject.initialize();
                const result = subject.getCommandTemplate('about');
                const rowCount = await CommandPhrase.count({ where: { commandName: 'about' } });

                // Assert
                expect(result).toBe(editedTemplate);
                expect(rowCount).toBe(1);
            });
        });
        describe('getCommandTemplate', () => {
            it('should return the command (cache)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('about');

                // Assert
                expect(result).toBe(defaultPhrases.about);
            });
            it('should return undefined for invalid commandName', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('');

                // Assert
                expect(result).toBe(undefined);
            });
            it('should return undefined for unknown command', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandTemplate('unknown');

                // Assert
                expect(result).toBe(undefined);
            });
        });
        describe('setCommandTemplate()', () => {
            it('should return false with empty commandName', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandTemplate('', 'Valid template...');

                // Assert
                expect(result).toBe<PhraseUpdateResult>('invalidInput');
            });
            it('should return false with empty template', async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.setCommandTemplate('ValidKey', '');

                // Assert
                expect(result).toBe<PhraseUpdateResult>('invalidInput');
            });
            it('row updated and gets new template', async () => {
                // Arrange
                const editedTemplate = 'edited template';

                // Act
                const result = await subject.setCommandTemplate('about', editedTemplate);
                const cached = subject.getCommandTemplate('about');
                const rows = await CommandPhrase.findAll({ where: { commandName: 'about' } });

                // Assert
                expect(result).toBe<PhraseUpdateResult>('updated');
                expect(cached).toBe(editedTemplate);
                expect(rows.length).toBe(1);
                expect(rows[0].template).toBe(editedTemplate);
            });
            it('unknown key returns false, cache preserved', async () => {
                // Arrange
                const key = 'Unknown';
                const template = 'edited template...';

                // Act & Assert
                expect(await subject.setCommandTemplate(key, template)).toBe<PhraseUpdateResult>('notEditable');
                expect(subject.getCommandTemplate(key)).toBe(undefined);
            });
            it('invalid template (too short) rejected', async () => {
                // Arrange
                const badtemplate = 'BAD!';

                // Act
                const result = await subject.setCommandTemplate('about', badtemplate);

                // Assert
                expect(result).toBe<PhraseUpdateResult>('invalidTemplate');
                expect(subject.getCommandTemplate('about')).toBe(defaultPhrases.about);
            });
            it('non-validation error propagates', async () => {
                // Arrange
                const spy = jest.spyOn(CommandPhrase, 'updateCommandTemplate')
                    .mockRejectedValueOnce(new Error('connection lost'));

                // Act & Assert
                await expect(subject.setCommandTemplate('about', 'valid template text'))
                    .rejects.toThrow('connection lost');

                spy.mockRestore();
            });
        });
    });
});
