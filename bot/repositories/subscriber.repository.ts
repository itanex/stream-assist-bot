import { inject, injectable } from 'inversify';
import winston from 'winston';
import {
    ChatCommunitySubInfo,
    ChatSubExtendInfo,
    ChatSubGiftInfo,
    ChatSubInfo,
} from '@twurple/chat';
import InjectionTypes from '../../dependency-management/types.js';
import { Subscribers, SubscriptionGiftUsers, SubscriptionType } from '../../database/index.js';

@injectable()
export default class SubscriberRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async createSubscriptionRecord(subInfo: ChatSubInfo): Promise<Subscribers | null> {
        try {
            return Subscribers
                .create({
                    subscriber: subInfo.displayName,
                    type: subInfo.isPrime ? SubscriptionType.PrimeSub : SubscriptionType.NewSub,
                    streak: subInfo.streak,
                    months: subInfo.months,
                    isPrime: subInfo.isPrime,
                    plan: subInfo.plan,
                    planName: subInfo.planName,
                    time: new Date(),
                    gift: null,
                }, {
                    isNewRecord: true,
                    validate: true,
                });
        } catch (error: any) {
            this.logger.error(`Error saving subscription to database`, error);
        }

        return null;
    }

    async createSubscriptionExtendedRecord(subInfo: ChatSubExtendInfo, isPrime: boolean): Promise<Subscribers | null> {
        try {
            return Subscribers
                .create({
                    subscriber: subInfo.displayName,
                    type: SubscriptionType.ReSub,
                    streak: null,
                    months: subInfo.months,
                    isPrime, // subInfo.isPrime (not on interface)
                    plan: subInfo.plan,
                    planName: null, // subInfo.planName (not on interface)
                    time: new Date(),
                    gift: null,
                }, {
                    isNewRecord: true,
                    validate: true,
                });
        } catch (error: any) {
            this.logger.error(`Error saving subscription to database`, error);
        }

        return null;
    }

    async createSubscriptionResubRecord(subInfo: ChatSubInfo): Promise<Subscribers | null> {
        try {
            return Subscribers
                .create({
                    subscriber: subInfo.displayName,
                    type: SubscriptionType.ReSub,
                    streak: subInfo.streak,
                    months: subInfo.months,
                    isPrime: subInfo.isPrime,
                    plan: subInfo.plan,
                    planName: subInfo.planName,
                    time: new Date(),
                    gift: null,
                }, {
                    isNewRecord: true,
                    validate: true,
                });
        } catch (error: any) {
            this.logger.error(`Error saving subscription to database`, error);
        }

        return null;
    }

    async createSubscriptionCommunityRecord(subInfo: ChatCommunitySubInfo): Promise<Subscribers | null> {
        try {
            return Subscribers
                .create({
                    subscriber: null,
                    type: SubscriptionType.CommunitySub,
                    streak: null,
                    months: null,
                    isPrime: false,
                    plan: subInfo.plan,
                    planName: null,
                    time: new Date(),
                    gift: {
                        gifter: subInfo.gifterDisplayName,
                        giftCount: subInfo.count,
                    },
                }, {
                    isNewRecord: true,
                    validate: true,
                    include: [SubscriptionGiftUsers],
                });
        } catch (error: any) {
            this.logger.error(`Error saving subscription to database`, error);
        }

        return null;
    }

    async createSubscriptionGiftRecord(subInfo: ChatSubGiftInfo): Promise<Subscribers | null> {
        try {
            return Subscribers
                .create({
                    subscriber: subInfo.displayName,
                    type: SubscriptionType.GiftSub,
                    streak: subInfo.streak,
                    months: subInfo.months,
                    isPrime: false, // Cannot gift a prime sub
                    plan: subInfo.plan,
                    planName: subInfo.planName,
                    time: new Date(),
                    gift: {
                        gifter: subInfo.gifterDisplayName,
                        giftCount: 1,
                    },
                }, {
                    isNewRecord: true,
                    validate: true,
                    include: [SubscriptionGiftUsers],
                });
        } catch (error: any) {
            this.logger.error(`Error saving subscription to database`, error);
        }

        return null;
    }

    /**
     * Get the last subscriber in the database
     * @returns The record of the last Subscriber
     */
    async getLastSubscriber(): Promise<Subscribers | null> {
        return Subscribers
            .findOne({
                order: [['createdAt', 'DESC']],
                include: [SubscriptionGiftUsers],
            });
    }
}
