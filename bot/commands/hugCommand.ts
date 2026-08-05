import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class HugCommand implements ICommandHandler {
    exp: RegExp = /^!(hug|hugs)(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
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

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (args[0]) {
            const user = await this.apiClient.users.getUserByName(args[0]);

            if (user) {
                if (userstate.displayName !== user.displayName) {
                    await this.chatClient.say(channel, `${userstate.displayName} hugs ${user.displayName}`);
                } else {
                    await this.chatClient.say(channel, `${userstate.displayName} hugs themself`);
                }
            } else {
                await this.chatClient.say(channel, `${userstate.displayName} can't find ${args[0]} and decides to hug everyone`);
            }
        } else {
            await this.chatClient.say(channel, `${userstate.displayName} hugs themself`);
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
