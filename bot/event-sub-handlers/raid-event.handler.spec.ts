import 'reflect-metadata';
import { jest } from '@jest/globals';
import { EventSubChannelRaidEvent } from '@twurple/eventsub-base';
import { mockError, mockLogger } from '../../tests/common.mocks.js';
import { RaidEvent } from '../../database/index.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';
import RaidEventHandler from './raid-event.handler.js';

const mockChannelEventRepository = <unknown>{
    saveRaidEvent: jest.fn<(event: EventSubChannelRaidEvent) => Promise<RaidEvent>>(),
} as jest.Mocked<ChannelEventRepository>;

describe('Raid Event Handler Tests', () => {
    let subject: RaidEventHandler;

    const event = <unknown>{
        raidingBroadcasterId: 'test-raiding-broadcaster-id',
        raidingBroadcasterDisplayName: 'testRaidingBroadcaster',
        raidedBroadcasterId: 'test-raided-broadcaster-id',
        raidedBroadcasterDisplayName: 'testRaidedBroadcaster',
        viewers: 25,
    } as EventSubChannelRaidEvent;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new RaidEventHandler(
            mockChannelEventRepository,
            mockLogger,
        );
    });

    it('should save the raid event and log the raid', async () => {
        // Arrange
        mockChannelEventRepository
            .saveRaidEvent
            .mockResolvedValue(<unknown>{} as RaidEvent);

        // Act
        await subject.raid(event);

        // Assert
        expect(mockChannelEventRepository.saveRaidEvent)
            .toHaveBeenCalledTimes(1);
        expect(mockChannelEventRepository.saveRaidEvent)
            .toHaveBeenCalledWith(event);
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.any(String));
        expect(mockLogger.error)
            .not.toHaveBeenCalled();
    });

    it('should log an error and not log the raid when the save fails', async () => {
        // Arrange
        mockChannelEventRepository
            .saveRaidEvent
            .mockRejectedValue(mockError);

        // Act
        await subject.raid(event);

        // Assert
        expect(mockChannelEventRepository.saveRaidEvent)
            .toHaveBeenCalledWith(event);
        expect(mockLogger.error)
            .toHaveBeenCalledWith(expect.any(String), mockError);
        expect(mockLogger.info)
            .not.toHaveBeenCalled();
    });
});
