import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import cron from 'node-cron';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { LurkingUsers, StreamEventRecord } from '../../database';

@injectable()
export default class StreamEventHandler {
    /** NodeJS.Timeout Reference */
    static clearTimeoutRef = null;

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async streamOnline(event: EventSubStreamOnlineEvent): Promise<void> {
        // if an existing timeout is in progress lets remove it
        // this is because we recovered from a stream shutdown event
        if (StreamEventHandler.clearTimeoutRef) {
            clearTimeout(StreamEventHandler.clearTimeoutRef);
            StreamEventHandler.clearTimeoutRef = null;
        }

        // decide to clean up lurking users on fresh stream...

        return StreamEventRecord
            .saveStreamStartEvent(event)
            .then(
                (record: StreamEventRecord) => {
                    this.logger.info(`Start of stream (E-${event.id}::R-${record.streamId})`);
                },
                (reason: any) => {
                    this.logger.error('Error trying to record end of stream in DB', reason);
                },
            );
    }

    async streamOffline(event: EventSubStreamOfflineEvent): Promise<void> {
        // Time we received the event
        const endTime = new Date();
        const delay = (now => now.setMinutes(now.getMinutes() + 10))(new Date());

        StreamEventHandler.clearTimeoutRef = setTimeout(() => this.unlurkUsers(endTime), delay);

        return StreamEventRecord
            .saveStreamEndEvent(endTime, event)
            .then(
                ([count, _]: [number, StreamEventRecord[]]) => {
                    this.logger.info(`End of stream record in DB: Count ${count}`);
                },
                (reason: any) => {
                    this.logger.error('Error trying to record end of stream in DB', reason);
                },
            );
    }

    /**
     * Unlurk all users by calling {@link LurkingUsers.setAllUsersToUnlurk}
     * @returns The resulting promise
     */
    private async unlurkUsers(endTime: Date) {
        return LurkingUsers
            .setAllUsersToUnlurk(endTime)
            .then(
                ([count, _]) => {
                    this.logger.info(`${count} users have been unlurked`);
                },
                (reason: any) => {
                    this.logger.error('Error trying to unlurk all users in DB', reason);
                },
            );
    }
}
