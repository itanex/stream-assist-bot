import { inject, injectable } from 'inversify';
import { EventSubChannelCheerEvent } from '@twurple/eventsub-base';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { CheerEvent } from '../../database/index.js';

@injectable()
export default class ChannelEventRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Saves the event record into the database as per the mapping results required
     * @param event The event record to save information from into the database
     * @returns The stored event record
     */
    async saveCheerEvent(event: EventSubChannelCheerEvent): Promise<CheerEvent> {
        const record: Partial<CheerEvent> = {
            bits: event.bits,
            isAnonymous: event.isAnonymous,
            message: event.message,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId!,
            userName: event.userName!,
            userDisplayName: event.userDisplayName!,
        };

        return CheerEvent
            .create(record);
    }
}
