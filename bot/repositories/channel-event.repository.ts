import { inject, injectable } from 'inversify';
import {
    EventSubChannelCheerEvent,
    EventSubChannelFollowEvent,
    EventSubChannelModeratorEvent,
    EventSubChannelRedemptionAddEvent,
} from '@twurple/eventsub-base';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import {
    ChannelPointRedeem,
    CheerEvent,
    FollowEvent,
    ModeratorEvent,
} from '../../database/index.js';

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

    /**
     * Saves the event record into the database as per the mapping results required
     * @param event The event record to save information from into the database
     * @returns The stored event record
     */
    async saveChannelPointRedeemEvent(event: EventSubChannelRedemptionAddEvent): Promise<ChannelPointRedeem> {
        const record: Partial<ChannelPointRedeem> = {
            eventId: event.id,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
            input: event.input,
            status: event.status,
            rewardId: event.rewardId,
            rewardTitle: event.rewardTitle,
            rewardCost: event.rewardCost,
            rewardPrompt: event.rewardPrompt,
            redemptionDate: event.redemptionDate,
        };

        return ChannelPointRedeem
            .create(record);
    }

    /**
     * Records the event of a user following the specific channel (broadcaster)
     * @param event Follow Event
     * @returns Follow Event Record
     */
    async saveFollowEvent(event: EventSubChannelFollowEvent): Promise<FollowEvent> {
        const record: Partial<FollowEvent> = {
            followDate: event.followDate,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return FollowEvent
            .create(record);
    }

    /**
     * Maps add moderator event to DBO and saves a new event in the database
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    async addUserAsMod(event: EventSubChannelModeratorEvent): Promise<ModeratorEvent> {
        const record: Partial<ModeratorEvent> = {
            addDate: new Date(),
            removeDate: null!,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return ModeratorEvent
            .create(record);
    }

    /**
     * Updates moderator event in DB with a remove date
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    async removeUserAsMod(event: EventSubChannelModeratorEvent): Promise<[number, ModeratorEvent[]]> {
        return ModeratorEvent
            .update(
                { removeDate: new Date() },
                {
                    where: {
                        removeDate: null,
                        broadcasterId: event.broadcasterId,
                        userId: event.userId,
                    },
                    returning: true,
                },
            );
    }
}
