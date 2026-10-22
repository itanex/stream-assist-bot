import { inject, injectable } from 'inversify';
import {
    EventSubChannelCheerEvent,
    EventSubChannelFollowEvent,
    EventSubChannelModeratorEvent,
    EventSubChannelRaidEvent,
    EventSubChannelRedemptionAddEvent,
} from '@twurple/eventsub-base';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import {
    ChannelPointRedeemDbo,
    CheerEventDbo,
    FollowEventDbo,
    ModeratorEventDbo,
    RaidEventDbo,
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
    async saveCheerEvent(event: EventSubChannelCheerEvent): Promise<CheerEventDbo> {
        const record: Partial<CheerEventDbo> = {
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

        return CheerEventDbo
            .create(record);
    }

    /**
     * Saves the event record into the database as per the mapping results required
     * @param event The event record to save information from into the database
     * @returns The stored event record
     */
    async saveChannelPointRedeemEvent(event: EventSubChannelRedemptionAddEvent): Promise<ChannelPointRedeemDbo> {
        const record: Partial<ChannelPointRedeemDbo> = {
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

        return ChannelPointRedeemDbo
            .create(record);
    }

    /**
     * Records the event of a user following the specific channel (broadcaster)
     * @param event Follow Event
     * @returns Follow Event Record
     */
    async saveFollowEvent(event: EventSubChannelFollowEvent): Promise<FollowEventDbo> {
        const record: Partial<FollowEventDbo> = {
            followDate: event.followDate,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return FollowEventDbo
            .create(record);
    }

    /**
     * Maps add moderator event to DBO and saves a new event in the database
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    async addUserAsMod(event: EventSubChannelModeratorEvent): Promise<ModeratorEventDbo> {
        const record: Partial<ModeratorEventDbo> = {
            addDate: new Date(),
            removeDate: null!,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return ModeratorEventDbo
            .create(record);
    }

    /**
     * Updates moderator event in DB with a remove date
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    async removeUserAsMod(event: EventSubChannelModeratorEvent): Promise<[number, ModeratorEventDbo[]]> {
        return ModeratorEventDbo
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

    /**
     * Records the event of the raiding broadcaster and the raided broadcaster
     * @param event Raid Event
     * @returns Raid Event Record
     */
    async saveRaidEvent(event: EventSubChannelRaidEvent): Promise<RaidEventDbo> {
        const record: Partial<RaidEventDbo> = {
            raidDate: new Date(),
            raidingBroadcasterId: event.raidingBroadcasterId,
            raidingBroadcasterName: event.raidingBroadcasterName,
            raidingBroadcasterDisplayName: event.raidingBroadcasterDisplayName,
            raidedBroadcasterId: event.raidedBroadcasterId,
            raidedBroadcasterName: event.raidedBroadcasterName,
            raidedBroadcasterDisplayName: event.raidedBroadcasterDisplayName,
            viewers: event.viewers,
        };

        return RaidEventDbo
            .create(record);
    }

    /**
     * Gets the last raid into the given broadcaster's channel from the database
     * @param raidedBroadcasterId ID of the broadcaster that was raided
     * @returns the raid event record of the last incoming raid
     */
    async getLastRaidEvent(raidedBroadcasterId: string): Promise<RaidEventDbo | null> {
        return RaidEventDbo
            .findOne({
                where: { raidedBroadcasterId },
                order: [['raidDate', 'DESC']],
            });
    }
}
