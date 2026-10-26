import 'reflect-metadata';
import { jest } from '@jest/globals';
import {
    EventSubChannelCheerEvent,
    EventSubChannelFollowEvent,
    EventSubChannelModeratorEvent,
    EventSubChannelRaidEvent,
    EventSubChannelRedemptionAddEvent,
} from '@twurple/eventsub-base';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import {
    createTestDatabase,
    dropTestDatabase,
    mockLogger,
} from '../../tests/index.js';
import {
    ChannelPointRedeemDbo,
    CheerEventDbo,
    FollowEventDbo,
    RaidEventDbo,
} from '../../database/index.js';

type ChannelEventRepositoryModule = typeof import('./channel-event.repository.js');

describe('ChannelEvent.Repository (postgres)', () => {
    let databaseConfiguration: IDatabaseConfiguration;

    let ChannelEventRepository: ChannelEventRepositoryModule['default'];

    let subject: InstanceType<ChannelEventRepositoryModule['default']>;

    beforeAll(async () => {
        databaseConfiguration = await createTestDatabase();

        ({ default: ChannelEventRepository } = await import('./channel-event.repository.js'));
    });

    afterAll(async () => {
        await dropTestDatabase(databaseConfiguration);
    });

    describe('Valid Database Object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.connect();
            subject = new ChannelEventRepository(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            await CheerEventDbo.destroy({ where: {}, force: true });
            await ChannelPointRedeemDbo.destroy({ where: {}, force: true });
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
                const row = await CheerEventDbo
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
                const row = await ChannelPointRedeemDbo
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
                const row = await FollowEventDbo
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
                const row = await FollowEventDbo
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
                const row = await FollowEventDbo
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

        describe('RaidEvent()', () => {
            const broadcasterId = 'test-broadcaster-id';

            /** Builds a raid record; incoming raids target broadcasterId, outgoing raids originate from it */
            const buildRaid = (direction: 'incoming' | 'outgoing', raidDate: Date, name: string) => ({
                raidDate,
                viewers: 25,
                raidingBroadcasterId: direction === 'outgoing' ? broadcasterId : `${name}-id`,
                raidingBroadcasterName: direction === 'outgoing' ? 'test-broadcaster-name' : name,
                raidingBroadcasterDisplayName: direction === 'outgoing' ? 'testBroadcaster' : name,
                raidedBroadcasterId: direction === 'incoming' ? broadcasterId : `${name}-id`,
                raidedBroadcasterName: direction === 'incoming' ? 'test-broadcaster-name' : name,
                raidedBroadcasterDisplayName: direction === 'incoming' ? 'testBroadcaster' : name,
            });

            beforeEach(async () => {
                await RaidEventDbo.destroy({ where: {}, force: true });
            });

            it('saved raid event record is persisted in database', async () => {
                // Arrange
                const event = {
                    raidingBroadcasterId: 'test-raiding-broadcaster-id',
                    raidingBroadcasterName: 'test-raiding-broadcaster-name',
                    raidingBroadcasterDisplayName: 'testRaidingbroadcaster',
                    raidedBroadcasterId: 'test-raided-broadcaster-id',
                    raidedBroadcasterName: 'test-raided-broadcaster-name',
                    raidedBroadcasterDisplayName: 'testRaidedbroadcaster',
                    viewers: 25,
                } as EventSubChannelRaidEvent;

                // Act
                const result = await subject.saveRaidEvent(event);
                const row = await RaidEventDbo
                    .findOne({
                        where: {
                            raidingBroadcasterId: event.raidingBroadcasterId,
                            raidedBroadcasterId: event.raidedBroadcasterId,
                        },
                    });

                // Assert
                expect(row).not.toBe(undefined);
                expect(result).toEqual(expect.objectContaining(event));
            });
            it('returns the last raid into the broadcaster', async () => {
                // Arrange
                const event = {
                    raidingBroadcasterId: 'test-raiding-broadcaster-id',
                    raidingBroadcasterName: 'test-raiding-broadcaster-name',
                    raidingBroadcasterDisplayName: 'testRaidingbroadcaster',
                    raidedBroadcasterId: broadcasterId,
                    raidedBroadcasterName: 'test-raided-broadcaster-name',
                    raidedBroadcasterDisplayName: 'testRaidedbroadcaster',
                    viewers: 25,
                } as EventSubChannelRaidEvent;
                const record = await subject.saveRaidEvent(event);

                // Act
                const result = await subject.getLastRaidEvent(broadcasterId);

                // Assert
                expect(record).not.toBe(null);
                expect(result?.raidDate).not.toBe(null);
                expect(result).toEqual(expect.objectContaining(event));
            });
            it('returns the newest incoming raid when an outgoing raid is newer', async () => {
                // Arrange
                await RaidEventDbo.bulkCreate([
                    buildRaid('incoming', new Date(2020, 0, 1), 'olderRaider'),
                    buildRaid('incoming', new Date(2020, 0, 2), 'newerRaider'),
                    buildRaid('outgoing', new Date(2020, 0, 3), 'raidedChannel'),
                ]);

                // Act
                const result = await subject.getLastRaidEvent(broadcasterId);

                // Assert
                expect(result?.raidingBroadcasterDisplayName).toBe('newerRaider');
                expect(result?.raidedBroadcasterId).toBe(broadcasterId);
            });
            it('returns null when there are no incoming raids', async () => {
                // Arrange
                await RaidEventDbo.create(buildRaid('outgoing', new Date(2020, 0, 1), 'raidedChannel'));

                // Act
                const result = await subject.getLastRaidEvent(broadcasterId);

                // Assert
                expect(result).toBeNull();
            });
        });
    });
});
