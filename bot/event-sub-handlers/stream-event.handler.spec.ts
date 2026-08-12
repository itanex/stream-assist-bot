import 'reflect-metadata';
import { jest } from '@jest/globals';
import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { mockLogger } from '../../tests/common.mocks.js';
import StreamEventHandler from './stream-event.handler.js';
import { LurkingUsers, StreamEventRecord } from '../../database/index.js';

describe('Stream Event Handler Tests', () => {
    let subject: StreamEventHandler;

    beforeEach(() => {
        jest.resetAllMocks();

        // prevent timers from running
        jest.useFakeTimers();

        subject = new StreamEventHandler(
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

            StreamEventRecord.getLastStream = jest.fn<() => Promise<StreamEventRecord>>()
                .mockResolvedValue(record);
            StreamEventRecord.saveStreamStartEvent = jest.fn<() => Promise<StreamEventRecord>>()
                .mockResolvedValue(record);

            LurkingUsers.setAllUsersToUnlurk = jest.fn<() => Promise<[number, LurkingUsers[]]>>();

            StreamEventHandler.clearTimeoutRef = null;

            // Act
            await subject.streamOnline(event as EventSubStreamOnlineEvent);

            // Arrange
            expect(StreamEventRecord.getLastStream)
                .toHaveBeenCalledTimes(1);
            expect(StreamEventRecord.getLastStream)
                .toHaveBeenCalledWith(event.broadcasterId);

            expect(StreamEventRecord.saveStreamStartEvent)
                .toHaveBeenCalledTimes(1);
            expect(StreamEventRecord.saveStreamStartEvent)
                .toHaveBeenCalledWith(event);

            expect(LurkingUsers.setAllUsersToUnlurk)
                .toHaveBeenCalledTimes(1);
            expect(LurkingUsers.setAllUsersToUnlurk)
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

            StreamEventRecord.saveStreamEndEvent = jest.fn<() => Promise<[number, StreamEventRecord[]]>>()
                .mockResolvedValue([1, records as StreamEventRecord[]]);

            StreamEventHandler.clearTimeoutRef = null;

            // Act
            await subject.streamOffline(event as EventSubStreamOfflineEvent);

            // Arrange
            expect(StreamEventRecord.saveStreamEndEvent)
                .toHaveBeenCalledTimes(1);
            expect(StreamEventRecord.saveStreamEndEvent)
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
