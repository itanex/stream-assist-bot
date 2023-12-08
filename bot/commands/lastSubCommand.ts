import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';
import {
    Subscribers,
    SubscriptionGiftUsers,
    SubscriptionType,
} from '../../database';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class LastSubCommand implements ICommandHandler {
    exp: RegExp = /^!(lastsub)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await Subscribers
            .findOne({ order: [['createdAt', 'DESC']], include: [SubscriptionGiftUsers] })
            .then(record => {
                const lastDate = dayjs(record.createdAt).fromNow();

                // eslint-disable-next-line default-case
                switch (record.type) {
                    case SubscriptionType.NewSub:
                        this.chatClient.say(channel, `${record.subscriber}, subscribed as a new member of the colony ${lastDate}`);
                        break;
                    case SubscriptionType.PrimeSub:
                        this.chatClient.say(channel, `${record.subscriber}, subscibed using their Prime Sub ${lastDate}`);
                        break;
                    case SubscriptionType.ReSub:
                        this.chatClient.say(channel, `${record.subscriber} continued their colony membership ${lastDate}`);
                        break;
                    case SubscriptionType.GiftSub:
                        this.chatClient.say(channel, `${record.gift.gifter} gifted, ${record.subscriber}, recruiting them into the colony ${lastDate}`);
                        break;
                    case SubscriptionType.CommunitySub:
                        this.chatClient.say(channel, `${record.gift.gifter} gifted ${record.gift.giftCount} memberships into the colony ${lastDate}`);
                        break;
                }
            });

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
    }
}
