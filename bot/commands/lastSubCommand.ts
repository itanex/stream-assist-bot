import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import calendar from 'dayjs/plugin/calendar.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import {
    SubscriptionType,
} from '../../database/index.js';
import SubscriberRepository from '../repositories/subscriber.repository.js';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class LastSubCommand implements ICommandHandler {
    exp: RegExp = /^!(lastsub)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(SubscriberRepository) private subscriberRepository: SubscriberRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await this.subscriberRepository
            .getLastSubscriber()
            .then(async record => {
                const lastDate = dayjs(record!.createdAt).fromNow();

                // eslint-disable-next-line default-case
                switch (record!.type) {
                    case SubscriptionType.NewSub:
                        await this.chatClient.say(channel, `${record!.subscriber}, subscribed as a new member of the colony ${lastDate}`);
                        break;
                    case SubscriptionType.PrimeSub:
                        await this.chatClient.say(channel, `${record!.subscriber}, subscribed using their Prime Sub ${lastDate}`);
                        break;
                    case SubscriptionType.ReSub:
                        await this.chatClient.say(channel, `${record!.subscriber} continued their colony membership ${lastDate}`);
                        break;
                    case SubscriptionType.GiftSub:
                        await this.chatClient.say(channel, `${record!.gift.gifter} gifted, ${record!.subscriber}, recruiting them into the colony ${lastDate}`);
                        break;
                    case SubscriptionType.CommunitySub:
                        await this.chatClient.say(channel, `${record!.gift.gifter} gifted ${record!.gift.giftCount} memberships into the colony ${lastDate}`);
                        break;
                }
            });

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName}`);
    }
}
