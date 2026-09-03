import { inject, injectable } from 'inversify';
import { EventSubChannelBanEvent, EventSubChannelUnbanEvent } from '@twurple/eventsub-base';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { BanEvent } from '../../database/index.js';

@injectable()
export default class BanEventRepository {
    static UnbanReason: string = 'SYS-UNBAN - Event';

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Saves the Event Sub Ban Event into the database
     * @param event The Ban Event received from the Event Sub
     * @returns The recorded Ban Event database record
     */
    async saveBanEvent(event: EventSubChannelBanEvent): Promise<BanEvent> {
        const record: Partial<BanEvent> = {
            reason: event.reason,
            startDate: event.startDate,
            endDate: event.endDate!,
            isPermanent: event.isPermanent,
            moderatorId: event.moderatorId,
            moderatorName: event.moderatorName,
            moderatorDisplayName: event.moderatorDisplayName,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return BanEvent
            .create(record);
    }

    /**
     * Saves the Event Sub Unban Event into the database
     * @param event The Unban Event received from the Event Sub
     * @returns The recorded Unban Event database record
     */
    async saveUnbanEvent(event: EventSubChannelUnbanEvent): Promise<BanEvent> {
        const record: Partial<BanEvent> = {
            reason: BanEventRepository.UnbanReason,
            startDate: null!,
            endDate: new Date(),
            isPermanent: false,
            moderatorId: event.moderatorId,
            moderatorName: event.moderatorName,
            moderatorDisplayName: event.moderatorDisplayName,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return BanEvent
            .create(record);
    }
}
