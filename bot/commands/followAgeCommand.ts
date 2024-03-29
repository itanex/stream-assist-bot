import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import environment from '../../configurations/environment';
import Timespan, { getAgeReport } from '../utilities/timeSpan';

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
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        let followingUser: { displayName: string, id: string } = null;

        if (args[1]) { // if args1 results in a username as part of the command being executed
            const user = await this.apiClient.users.getUserByName(args[1]);
            followingUser = {
                displayName: user.displayName,
                id: user.id,
            };
        } else if (!userstate.isBroadcaster) {
            followingUser = {
                displayName: userstate.displayName,
                id: userstate.userId,
            };
        }

        if (followingUser) {
            const follower = await this.apiClient.channels
                .getChannelFollowers(environment.twitchBot.broadcaster.id, followingUser.id);

            const ageTimeSpan = Timespan.fromNow(follower.data[0].followDate);

            this.chatClient.say(channel, `@${followingUser.displayName} has been following ${channel} for ${getAgeReport(ageTimeSpan)}`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
