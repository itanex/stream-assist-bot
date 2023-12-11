import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';
import { Broadcaster } from '../../utilities/broadcaster';
import environment from '../../configurations/environment';
import Timespan, { TimespanReport } from '../../utilities/timeSpan';

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
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(TYPES.Logger) private logger: winston.Logger,
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
                .getChannelFollowers(environment.broadcasterId, followingUser.id);

            const ageTimeSpan = (new Timespan())
                .FromNow(follower.data[0].followDate)
                .getTimeSpan;

            const ageReport = this.getAgeReport(ageTimeSpan);

            this.chatClient.say(channel, `@${followingUser.displayName} has been following ${channel} for ${ageReport}`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }

    getAgeReport(timespan: TimespanReport) {
        const result: string[] = [];

        if (timespan.Years) {
            result.push(timespan.Years === 1
                ? `${timespan.Years} year`
                : `${timespan.Years} years`);
        }

        if (timespan.Months) {
            result.push(timespan.Months === 1
                ? `${timespan.Months} month`
                : `${timespan.Months} months`);
        }

        if (timespan.Days) {
            result.push(timespan.Days === 1
                ? `${timespan.Days} day`
                : `${timespan.Days} days`);
        }

        if (timespan.Hours) {
            result.push(timespan.Hours === 1
                ? `${timespan.Hours} hour`
                : `${timespan.Hours} hours`);
        }

        // if (timespan.Minutes) {
        //     result.push(timespan.Minutes === 1
        //         ? `${timespan.Minutes} minute`
        //         : `${timespan.Minutes} minutes`);
        // }

        return result.join(' ');
    }
}
