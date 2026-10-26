import 'reflect-metadata';
import { jest } from '@jest/globals';
import { EventSubChannelBanEvent, EventSubChannelUnbanEvent } from '@twurple/eventsub-base';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import {
    createTestDatabase,
    dropTestDatabase,
    mockLogger,
} from '../../tests/index.js';
import { BanEventDbo } from '../../database/index.js';

type BanEventRepositoryModule = typeof import('./ban-event.repository.js');

describe('BanEvent.Repository (postgres)', () => {
    let databaseConfiguration: IDatabaseConfiguration;

    let BanEventRepository: BanEventRepositoryModule['default'];

    let subject: InstanceType<BanEventRepositoryModule['default']>;

    beforeAll(async () => {
        databaseConfiguration = await createTestDatabase();

        ({ default: BanEventRepository } = await import('./ban-event.repository.js'));
    });

    afterAll(async () => {
        await dropTestDatabase(databaseConfiguration);
    });

    describe('Valid Database Object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.connect();
            subject = new BanEventRepository(mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            await BanEventDbo.destroy({ where: {}, force: true });
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
                const row = await BanEventDbo.findOne({
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
                const row = await BanEventDbo.findOne({
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
