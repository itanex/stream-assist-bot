import 'reflect-metadata';
import { jest } from '@jest/globals';
import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { mockLogger } from '../../tests/common.mocks.js';
import StreamEventHandler from './stream-event.handler.js';
import { LurkingUsers, StreamEventRecord } from '../../database/index.js';
import { LurkRespository, StreamEventRepository } from '../repositories/index.js';

const mockLurkRepository = <unknown>{
    setAllUsersToUnlurk: jest.fn<() => Promise<[number, LurkingUsers[]]>>(),
} as jest.Mocked<LurkRespository>;

const mockStreamEventRepository = <unknown>{
    getLastStream: jest.fn<() => Promise<StreamEventRecord | null>>(),
    saveStreamStartEvent: jest.fn<() => Promise<StreamEventRecord | null>>(),
    saveStreamEndEvent: jest.fn<() => Promise<[number, StreamEventRecord[]]>>(),
} as jest.Mocked<StreamEventRepository>;

describe('Stream Event Handler Tests', () => {
    let subject: StreamEventHandler;

    beforeEach(() => {
        jest.resetAllMocks();

        // prevent timers from running
        jest.useFakeTimers();

        subject = new StreamEventHandler(
            mockLurkRepository,
            mockStreamEventRepository,
            mockLogger,
        );
    });

    describe('Start Stream Event', () => {
        it('should not run timeout, invoke unlurk all users, and save record in db', async () => {
            // Arrange
            const record = <unknown>{
                endDate: new Date(),
                streamId: '1234',
            } as StreamEventRecord;

            const event = <unknown>{
                broadcasterId: '1234',
                id: record.streamId,
            } as EventSubStreamOnlineEvent;

            mockStreamEventRepository
                .getLastStream
                .mockResolvedValue(record);
            mockStreamEventRepository
                .saveStreamStartEvent
                .mockResolvedValue(record);

            StreamEventHandler.clearTimeoutRef = null;

            // Act
            await subject.streamOnline(event as EventSubStreamOnlineEvent);

            // Arrange
            expect(mockStreamEventRepository.getLastStream)
                .toHaveBeenCalledTimes(1);
            expect(mockStreamEventRepository.getLastStream)
                .toHaveBeenCalledWith(event.broadcasterId);

            expect(mockStreamEventRepository.saveStreamStartEvent)
                .toHaveBeenCalledTimes(1);
            expect(mockStreamEventRepository.saveStreamStartEvent)
                .toHaveBeenCalledWith(event);

            expect(mockLurkRepository.setAllUsersToUnlurk)
                .toHaveBeenCalledTimes(1);
            expect(mockLurkRepository.setAllUsersToUnlurk)
                .toHaveBeenCalledWith(record.endDate);

            expect(mockLogger.info)
                .toHaveBeenCalledTimes(1);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`${event.id}`));
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`${record.streamId}`));
            expect(mockLogger.error)
                .not.toHaveBeenCalled();
        });
    });

    describe('End Stream Event', () => {
        it('should not run timeout, invoke unlurk all users, and save record in db', async () => {
            // Arrange
            const records = [<unknown>{
                endDate: new Date(),
                streamId: '1234',
            } as StreamEventRecord];

            const event = <unknown>{
                broadcasterId: '1234',
            } as EventSubStreamOfflineEvent;

            mockStreamEventRepository
                .saveStreamEndEvent
                .mockResolvedValue([1, records as StreamEventRecord[]]);

            StreamEventHandler.clearTimeoutRef = null;

            // Act
            await subject.streamOffline(event as EventSubStreamOfflineEvent);

            // Arrange
            expect(mockStreamEventRepository.saveStreamEndEvent)
                .toHaveBeenCalledTimes(1);
            expect(mockStreamEventRepository.saveStreamEndEvent)
                .toHaveBeenCalledWith(expect.any(Date), event);

            expect(StreamEventHandler.clearTimeoutRef)
                .not.toBeNull();

            expect(mockLogger.info)
                .toHaveBeenCalledTimes(1);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining('Count 1'));
            expect(mockLogger.error)
                .not.toHaveBeenCalled();
        });
    });
});
