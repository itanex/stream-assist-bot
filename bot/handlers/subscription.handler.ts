/* eslint-disable no-unused-vars */
import { ChatClient, ChatCommunitySubInfo, ChatSubExtendInfo, ChatSubGiftInfo, ChatSubInfo, UserNotice } from '@twurple/chat';
import dayjs from 'dayjs';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { TYPES } from '../../dependency-management/types';
import Subscribers from '../../database/subscribers.dbo';
import { SubscriptionType } from '../../database/subcriptionType';
import SubsciptionGiftUsers from '../../database/subsciptionGiftUsers.dbo';

export interface ISubscriptionStreamEvent {
    onSubscribe(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void>;
    onSubExtend(channel: string, user: string, subInfo: ChatSubExtendInfo, message: UserNotice): Promise<void>;
    onResubHandler(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void>
    onCommunitySub(channel: string, user: string, subInfo: ChatCommunitySubInfo, message: UserNotice): Promise<void>
    onSubGift(channel: string, user: string, subInfo: ChatSubGiftInfo, message: UserNotice): Promise<void>
}

@injectable()
export class SubscriptionHandlers implements ISubscriptionStreamEvent {
    private giftCounts = new Map<string | undefined, number>();

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        // clear
    }

    async onSubscribe(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void> {
        this.chatClient.say(channel, `Thank you. @${user} joined the colony!`);

        await Subscribers
            .create({
                subscriber: subInfo.displayName,
                type: subInfo.isPrime ? SubscriptionType.PrimeSub : SubscriptionType.NewSub,
                streak: subInfo.streak,
                months: subInfo.months,
                isPrime: subInfo.isPrime,
                plan: subInfo.plan,
                planName: subInfo.planName,
                time: dayjs().toISOString(),
                gift: null,
            });

        this.logger.info(`* Executed Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onSubExtend(channel: string, user: string, subInfo: ChatSubExtendInfo, message: UserNotice): Promise<void> {
        const isPrime = subInfo.plan.toLocaleLowerCase() !== 'prime';

        if (isPrime) {
            this.chatClient.say(channel, `Thank you. @${user} for continuing with the colony at Tier ${Number(subInfo.plan) / 1000}!`);
        } else {
            this.chatClient.say(channel, `Thank you. @${user} for continuing with the colony using your twitch prime subscription`);
        }

        await Subscribers
            .create({
                subscriber: subInfo.displayName,
                type: SubscriptionType.ReSub,
                streak: null,
                months: subInfo.months,
                isPrime,
                plan: subInfo.plan,
                planName: null,
                time: dayjs().toISOString(),
                gift: null,
            });

        this.logger.info(`* Executed Sub Extend Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onResubHandler(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void> {
        this.chatClient.say(channel, `Thank you. @${user} has been with the colony for a total of ${subInfo.months} months!`);

        await Subscribers
            .create({
                subscriber: subInfo.displayName,
                type: SubscriptionType.ReSub,
                streak: subInfo.streak,
                months: subInfo.months,
                isPrime: subInfo.isPrime,
                plan: subInfo.plan,
                planName: subInfo.planName,
                time: dayjs().toISOString(),
                gift: null,
            });

        this.logger.info(`* Executed Resub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onCommunitySub(channel: string, user: string, subInfo: ChatCommunitySubInfo, message: UserNotice): Promise<void> {
        const previousGiftCount = this.giftCounts.get(user) ?? 0;
        this.giftCounts.set(user, previousGiftCount + subInfo.count);

        this.chatClient.say(channel, `Thank you, ${user} for gifting ${subInfo.count} subs to the community!`);

        await Subscribers
            .create({
                subscriber: null,
                type: SubscriptionType.CommunitySub,
                streak: null,
                months: null,
                isPrime: false,
                plan: subInfo.plan,
                planName: null,
                time: dayjs().toISOString(),
                gift: {
                    gifter: subInfo.gifterDisplayName,
                    giftCount: subInfo.gifterGiftCount,
                },
            }, {
                include: [SubsciptionGiftUsers],
            });

        this.logger.info(`* Executed Community Gift Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onSubGift(channel: string, user: string, subInfo: ChatSubGiftInfo, message: UserNotice): Promise<void> {
        const previousGiftCount = this.giftCounts.get(subInfo.gifter) ?? 0;

        if (previousGiftCount > 0) {
            this.giftCounts.set(subInfo.gifter, previousGiftCount - 1);
        } else {
            this.chatClient.say(channel, `Thank you, ${subInfo.gifterDisplayName} for recruiting ${user} into the colony!`);
        }

        await Subscribers
            .create({
                subscriber: subInfo.displayName,
                type: SubscriptionType.GiftSub,
                streak: subInfo.streak,
                months: subInfo.months,
                isPrime: subInfo.isPrime,
                plan: subInfo.plan,
                planName: subInfo.planName,
                time: dayjs().toISOString(),
                gift: {
                    gifter: subInfo.gifterDisplayName,
                    giftCount: subInfo.gifterGiftCount,
                },
            }, {
                include: [SubsciptionGiftUsers],
            });

        this.logger.info(`* Executed Gift Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }
}
