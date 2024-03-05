// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { Container } from 'inversify';
import winston from 'winston';
import { mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import StreamEventHandler from './stream-event.handler';
import { LurkingUsers, StreamEventRecord } from '../../database';

describe('Stream Event Handler Tests', () => {
    const container: Container = new Container();
    let expectedLogger: winston.Logger;

    beforeEach(() => {
        jest.resetAllMocks();
        container.unbindAll();

        // prevent timers from running
        jest.useFakeTimers();

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        container
            .bind<StreamEventHandler>(StreamEventHandler)
            .toSelf();

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('Start Stream Event', () => {
        it('should not run timeout, invoke unlurk all users, and save record in db', async () => {
            // Arrange
            const record: Partial<StreamEventRecord> = {
                endDate: new Date(),
                streamId: '1234',
            };

            const event: Partial<EventSubStreamOnlineEvent> = {
                broadcasterId: '1234',
                id: record.streamId,
            };

            StreamEventRecord.getLastStream = jest.fn()
                .mockResolvedValue(record);
            StreamEventRecord.saveStreamStartEvent = jest.fn()
                .mockResolvedValue(record);

            LurkingUsers.setAllUsersToUnlurk = jest.fn();

            const subject = container
                .get<StreamEventHandler>(StreamEventHandler);
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

            expect(expectedLogger.info)
                .toHaveBeenCalledTimes(1);
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`${event.id}`));
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`${record.streamId}`));
            expect(expectedLogger.error)
                .not.toHaveBeenCalled();
        });
    });

    describe('End Stream Event', () => {
        it('should not run timeout, invoke unlurk all users, and save record in db', async () => {
            // Arrange
            const records: Partial<StreamEventRecord>[] = [{
                endDate: new Date(),
                streamId: '1234',
            }];

            const event: Partial<EventSubStreamOfflineEvent> = {
                broadcasterId: '1234',
            };

            StreamEventRecord.saveStreamEndEvent = jest.fn()
                .mockResolvedValue([1, records as StreamEventRecord[]]);

            const subject = container
                .get<StreamEventHandler>(StreamEventHandler);
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

            expect(expectedLogger.info)
                .toHaveBeenCalledTimes(1);
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining('Count 1'));
            expect(expectedLogger.error)
                .not.toHaveBeenCalled();
        });
    });
});
