import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import { ApiClient } from '@twurple/api';
import winston from 'winston';
import ICommandHandler, { OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';

@injectable()
export default class BrainCommand implements ICommandHandler {
    exp: RegExp = /^!(brain)( [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 5;
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
        const user = args[0]
            ? args[0].toLocaleLowerCase().trim()
            : userstate.displayName;

        const percent = Math.ceil(Math.random() * 100);

        this.chatClient.say(channel, `${user}'s brain is ${percent}% working.`);

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
