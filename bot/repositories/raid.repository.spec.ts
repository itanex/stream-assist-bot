import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ChatRaidInfo } from '@twurple/chat';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import RaidRepository from './raid.repository.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { Raiders } from '../../database/index.js';

describe('Raid Respository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: RaidRepository;

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

    describe('Valid Database Object', () => {
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
            jest.useFakeTimers().setSystemTime(fixedDateTime);

            await Raiders.destroy({ where: {}, force: true });
            subject = new RaidRepository(mockLogger);
        });

        describe('getLastRaid()', () => {
            it('returns the last raid record in database', async () => {
                // Arrange
                const event: ChatRaidInfo = {
                    displayName: 'test-raiding-user',
                    viewerCount: 25,
                };
                const record = await subject.saveRaid(event);

                // Act
                const result = await subject.getLastRaid();

                // Assert
                expect(record).not.toBe(null);
                expect(result?.time).toStrictEqual(fixedDateTime);
                expect(result?.raider).toBe(event.displayName);
                expect(result?.viewerCount).toBe(event.viewerCount);
            });
        });

        describe('saveLastRaid()', () => {
            it('records the last raid into the database', async () => {
                // Arrange
                const event: ChatRaidInfo = {
                    displayName: 'test-raiding-user',
                    viewerCount: 25,
                };

                // Act
                const result = await subject.saveRaid(event);

                // Assert
                expect(result?.raider).toBe(event.displayName);
                expect(result?.viewerCount).toBe(event.viewerCount);
                expect(result?.time).toStrictEqual(fixedDateTime);
            });
            it('failure to save record create log error', async () => {
                // Arrange
                const event = {} as ChatRaidInfo;

                // Act
                const result = await subject.saveRaid(event);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), expect.anything());
            });
        });
    });
});
