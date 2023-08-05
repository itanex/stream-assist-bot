import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class FollowAgeCommand implements ICommandHandler {
    exp: RegExp = /^!(followage)( [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 10;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // if (args[1]) {
        //     const user = await this.apiClient.users.getUserByName(args[1]);
        //     const follow = await this.apiClient.users.getFollowFromUserToBroadcaster(user.id, (await Broadcaster()).id);
        //     const created = dayjs(follow.followDate);

        //     this.chatClient.say(channel, `@${user.displayName} has been following ${(await Broadcaster()).displayName} for ${created.fromNow(true)}`);
        // } else {
        //     if (userstate.isBroadcaster) {
        //         return;
        //     }

        //     return;
        // }

        // this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
