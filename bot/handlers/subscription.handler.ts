import {
    ChatClient,
    ChatCommunitySubInfo,
    ChatSubExtendInfo,
    ChatSubGiftInfo,
    ChatSubInfo,
    UserNotice,
} from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import SubscriberRepository from '../repositories/subscriber.repository.js';

export interface ISubscriptionHandler {
    onSubscribe(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void>;
    onSubExtend(channel: string, user: string, subInfo: ChatSubExtendInfo, message: UserNotice): Promise<void>;
    onResubHandler(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void>
    onCommunitySub(channel: string, user: string, subInfo: ChatCommunitySubInfo, message: UserNotice): Promise<void>
    onSubGift(channel: string, user: string, subInfo: ChatSubGiftInfo, message: UserNotice): Promise<void>
}

@injectable()
export class SubscriptionHandler implements ISubscriptionHandler {
    private giftCounts = new Map<string | undefined, number>();

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(SubscriberRepository) private subscriberRepository: SubscriberRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async onSubscribe(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void> {
        await this.chatClient.say(channel, `Thank you. @${user} joined the colony!`);

        await this.subscriberRepository
            .createSubscriptionRecord(subInfo);

        this.logger.info(`* Executed Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onSubExtend(channel: string, user: string, subInfo: ChatSubExtendInfo, message: UserNotice): Promise<void> {
        const isPrime = subInfo.plan.toLocaleLowerCase() !== 'prime';

        if (isPrime) {
            await this.chatClient.say(channel, `Thank you. @${user} for continuing with the colony at Tier ${Number(subInfo.plan) / 1000}!`);
        } else {
            await this.chatClient.say(channel, `Thank you. @${user} for continuing with the colony using your twitch prime subscription`);
        }

        await this.subscriberRepository
            .createSubscriptionExtendedRecord(subInfo, isPrime);

        this.logger.info(`* Executed Sub Extend Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onResubHandler(channel: string, user: string, subInfo: ChatSubInfo, message: UserNotice): Promise<void> {
        await this.chatClient.say(channel, `Thank you. @${user} has been with the colony for a total of ${subInfo.months} months!`);

        await this.subscriberRepository
            .createSubscriptionResubRecord(subInfo);

        this.logger.info(`* Executed Resub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onCommunitySub(channel: string, user: string, subInfo: ChatCommunitySubInfo, message: UserNotice): Promise<void> {
        const giftCount = subInfo.gifterGiftCount ?? subInfo.count;
        await this.chatClient.say(channel, `Thank you, ${user} for gifting ${giftCount} subs to the community!`);

        await this.subscriberRepository
            .createSubscriptionCommunityRecord(subInfo);

        this.logger.info(`* Executed Community Gift Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }

    async onSubGift(channel: string, user: string, subInfo: ChatSubGiftInfo, message: UserNotice): Promise<void> {
        const previousGiftCount = this.giftCounts.get(subInfo.gifter) ?? 0;

        if (previousGiftCount > 0) {
            this.giftCounts.set(subInfo.gifter, previousGiftCount - 1);
        } else {
            await this.chatClient.say(channel, `Thank you, ${subInfo.gifterDisplayName} for recruiting ${user} into the colony!`);
        }

        await this.subscriberRepository
            .createSubscriptionGiftRecord(subInfo);

        this.logger.info(`* Executed Gift Sub Handler :: "${user}", ${JSON.stringify(subInfo)}`);
    }
}
