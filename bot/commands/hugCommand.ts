import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class HugCommand implements ICommandHandler {
    exp: RegExp = /^!(hug|hugs)( [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (args[1]) {
            const user = await this.apiClient.users.getUserByName(args[1]);

            if (user) {
                if (userstate.displayName !== user.displayName) {
                    this.chatClient.say(channel, `${userstate.displayName} hugs ${user.displayName}`);
                } else {
                    this.chatClient.say(channel, `${userstate.displayName} hugs themself`);
                }
            } else {
                this.chatClient.say(channel, `${userstate.displayName} can't find ${args[1]} and decides to hug everyone`);
            }
        } else {
            this.chatClient.say(channel, `${userstate.displayName} hugs themself`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
