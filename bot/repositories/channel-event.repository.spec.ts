import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
    EventSubChannelCheerEvent,
    EventSubChannelFollowEvent,
    EventSubChannelModeratorEvent,
    EventSubChannelRedemptionAddEvent,
} from '@twurple/eventsub-base';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import { mockLogger } from '../../tests/common.mocks.js';
import {
    ChannelPointRedeem,
    CheerEvent,
    FollowEvent,
} from '../../database/index.js';

type ChannelEventRepositoryModule = typeof import('./channel-event.repository.js');

describe('ChannelEvent.Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    let ChannelEventRepository: ChannelEventRepositoryModule['default'];

    let subject: InstanceType<ChannelEventRepositoryModule['default']>;

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

        ({ default: ChannelEventRepository } = await import('./channel-event.repository.js'));
    }, 120_000);

    afterAll(async () => {
        await container.stop();
    });

    describe('Valid Database Object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.initialize();
            subject = new ChannelEventRepository(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            await CheerEvent.destroy({ where: {}, force: true });
            await ChannelPointRedeem.destroy({ where: {}, force: true });
        });

        describe('CheerEvent()', () => {
            it('saved cheer event record is persisted in database', async () => {
                // Arrange
                const event = {
                    bits: 25,
                    isAnonymous: false,
                    message: 'test-cheer-event-message',
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-cheer-user-id',
                    userName: 'test-cheer-username',
                    userDisplayName: 'testCheerUser',
                } as EventSubChannelCheerEvent;

                // Act
                const result = await subject.saveCheerEvent(event);
                const row = await CheerEvent
                    .findOne({
                        where: {
                            broadcasterId: event.broadcasterId,
                            userId: event.userId,
                        },
                    });
                // Assert
                expect(row).not.toBe(undefined);
                expect(result).toEqual(expect.objectContaining(event));
            });
        });

        describe('ChannelPointRedeemEvent()', () => {
            it('saved channel point event record is persisted in database', async () => {
                // Arrange
                const eventId = {
                    id: '40e7847b-a685-49a7-9a69-a599c6893e7f',
                };
                const event = {
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-event-user-id',
                    userName: 'test-event-username',
                    userDisplayName: 'testEventUser',
                    input: 'test-event-input-string',
                    status: 'test-event-status',
                    rewardId: '10dcc9a1-c021-458d-9d2e-d10174d1fc3c',
                    rewardTitle: 'test-event-reward-title',
                    rewardCost: 25,
                    rewardPrompt: 'test-event-reward-prompt',
                    redemptionDate: new Date(),
                } as EventSubChannelRedemptionAddEvent;

                // Act
                const result = await subject.saveChannelPointRedeemEvent({ ...event, ...eventId } as EventSubChannelRedemptionAddEvent);
                const row = await ChannelPointRedeem
                    .findOne({
                        where: {
                            broadcasterId: event.broadcasterId,
                            userId: event.userId,
                            rewardId: event.rewardId,
                        },
                    });

                // Assert
                expect(row).not.toBe(undefined);
                expect(result.eventId).toEqual(eventId.id);
                expect(result).toEqual(expect.objectContaining(event));
            });
        });

        describe('FollowEvent', () => {
            it('saved follow event record is persisted in database', async () => {
                // Arrange
                const event = {
                    followDate: new Date(),
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-event-user-id',
                    userName: 'test-event-username',
                    userDisplayName: 'testEventUser',
                } as EventSubChannelFollowEvent;

                // Act
                const result = await subject.saveFollowEvent(event);
                const row = await FollowEvent
                    .findOne({
                        where: {
                            broadcasterId: event.broadcasterId,
                            userId: event.userId,
                        },
                    });

                // Assert
                expect(row).not.toBe(undefined);
                expect(result).toEqual(expect.objectContaining(event));
            });
        });

        describe('ModeratorEvent()', () => {
            it('saved `user as mod` record is persisted in database', async () => {
                // Arrange
                const event = {
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-event-user-id',
                    userName: 'test-event-username',
                    userDisplayName: 'testEventUser',
                } as EventSubChannelModeratorEvent;

                // Act
                const result = await subject.addUserAsMod(event);
                const row = await FollowEvent
                    .findOne({
                        where: {
                            broadcasterId: event.broadcasterId,
                            userId: event.userId,
                        },
                    });

                // Assert
                expect(row).not.toBe(null);
                expect(result.addDate).not.toBe(null);
                expect(result.removeDate).toBe(null);
                expect(result).toEqual(expect.objectContaining(event));
            });
            it('saved `user removed as mod` record is persisted in database', async () => {
                // Arrange
                const event = {
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'testbroadcaster',
                    userId: 'test-event-user-id',
                    userName: 'test-event-username',
                    userDisplayName: 'testEventUser',
                } as EventSubChannelModeratorEvent;

                // Act
                const [count, result] = await subject.removeUserAsMod(event);
                const row = await FollowEvent
                    .findOne({
                        where: {
                            broadcasterId: event.broadcasterId,
                            userId: event.userId,
                        },
                    });

                // Assert
                expect(count).toBe(1);
                expect(row).not.toBe(null);
                expect(result[0].addDate).not.toBe(null);
                expect(result[0].removeDate).not.toBe(null);
                expect(result[0]).toEqual(expect.objectContaining(event));
            });
        });
    });
});
