import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
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

    /**
     * Start of stream processes
     * 1) Invalidate outstanding timer (unlurk user)
     * 2) Clean Up haning lurking users
     * 3) Record Start Stream event into the DB
     * @param event the stream online event
     */
    async streamOnline(event: EventSubStreamOnlineEvent): Promise<void> {
        // if an existing timeout is in progress lets remove it
        // this is because we recovered from a stream shutdown event
        if (StreamEventHandler.clearTimeoutRef) {
            clearTimeout(StreamEventHandler.clearTimeoutRef);
            StreamEventHandler.clearTimeoutRef = null;
        } else {
            // Clean up lurking users on fresh stream...
            const lastStream = await StreamEventRecord.getLastStream(event.broadcasterId);

            await LurkingUsers.setAllUsersToUnlurk(lastStream.endDate);
        }

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

    /**
     * End of stream processes
     * 1) Record End Stream event into the DB
     * 2) Establishes a simple timeout to Unlurk
     *    users that are remaining in the DB
     * @param event the stream offline event
     */
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
