import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { EventSubChannelBanEvent, EventSubChannelUnbanEvent } from '@twurple/eventsub-base';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { BanEvent } from '../../database/index.js';

type BanEventRepositoryModule = typeof import('./ban-event.repository.js');

describe('BanEvent.Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    let BanEventRepository: BanEventRepositoryModule['default'];

    let subject: InstanceType<BanEventRepositoryModule['default']>;

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

        ({ default: BanEventRepository } = await import('./ban-event.repository.js'));
    }, 120_000);

    afterAll(async () => {
        await container.stop();
    });

    describe('Valid Database Object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.initialize();
            subject = new BanEventRepository(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            await BanEvent.destroy({ where: {}, force: true });
        });

        describe('saveBanEvent()', () => {
            it('saved event record is persisted in database', async () => {
                // Arrange
                const event = {
                    reason: 'test reason',
                    startDate: new Date(),
                    endDate: null,
                    isPermanent: false,
                    moderatorId: 'test-mod-id',
                    moderatorName: 'test-mod-name',
                    moderatorDisplayName: 'testmod',
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-ban-user-id',
                    userName: 'test-ban-username',
                    userDisplayName: 'testBanUser',
                } as EventSubChannelBanEvent;

                // Act
                const result = await subject.saveBanEvent(event);
                const row = await BanEvent.findOne({
                    where: {
                        broadcasterId: event.broadcasterId,
                        userId: event.userId,
                        startDate: new Date(),
                    },
                });

                // Assert
                expect(row).not.toBe(undefined);
                expect(result).toEqual(expect.objectContaining(event));
            });
        });

        describe('saveUnbanEvent()', () => {
            it('saved event record is persisted in database', async () => {
                // Arrange
                const event = {
                    moderatorId: 'test-mod-id',
                    moderatorName: 'test-mod-name',
                    moderatorDisplayName: 'testmod',
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-ban-user-id',
                    userName: 'test-ban-username',
                    userDisplayName: 'testBanUser',
                } as EventSubChannelUnbanEvent;

                // Act
                const result = await subject.saveUnbanEvent(event);
                const row = await BanEvent.findOne({
                    where: {
                        broadcasterId: event.broadcasterId,
                        userId: event.userId,
                        startDate: null!,
                        endDate: new Date(),
                    },
                });

                // Assert
                expect(row).not.toBe(undefined);
                expect(result).toEqual(expect.objectContaining(event));
            });
        });
    });
});
