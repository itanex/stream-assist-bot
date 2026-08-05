import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import environment from '../../configurations/environment';
import Timespan, { getAgeReport } from '../utilities/timeSpan';
import { CommandName, TransientContext } from '../utilities/default-responses';
import CommandResponseService from '../utilities/command-response.service';
import { templateResolver } from '../utilities/template-resolver';
import Broadcaster from '../utilities/broadcaster';

@injectable()
export class FollowAgeCommand implements ICommandHandler {
    exp: RegExp = /^!(followage)(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 10;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'followage';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        let followingUser: { displayName: string, id: string } | null = null;

        if (args[0]) { // if args1 results in a username as part of the command being executed
            const user = await this.apiClient.users.getUserByName(args[0].toLocaleLowerCase().trim());

            if (user) {
                followingUser = {
                    displayName: user.displayName,
                    id: user.id,
                };
            }
        } else if (!userstate.isBroadcaster) { // broadcaster can't follow itself
            followingUser = {
                displayName: userstate.displayName,
                id: userstate.userId,
            };
        }

        if (followingUser) {
            const follower = await this.apiClient.channels
                .getChannelFollowers(environment.twitchBot.broadcaster.id, followingUser.id);

            if (follower.data[0]) {
                const result = this.commandResponseService.getCommandText(this.commandName);

                if (result) {
                    const context: TransientContext = {
                        targetuser: follower.data[0].userDisplayName,
                        broadcaster: (await this.broadcaster.getBroadcaster()).displayName,
                        followage: `${getAgeReport(Timespan.fromNow(follower.data[0].followDate))}`
                    }

                    this.chatClient.say(channel, templateResolver(result, context, this.logger));
                } else {
                    this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
                }
            }
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
