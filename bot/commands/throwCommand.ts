import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';

@injectable()
export default class ThrowCommand implements ICommandHandler {
    exp: RegExp = /^!(throw) ([\w\s]{2,48})( [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (args[2]) {
            this.chatClient.say(channel, `${userstate.displayName} throws ${args[0]} at ${args[2]}`);
        } else {
            this.chatClient.say(channel, `${userstate.displayName} throws ${args[0]} across the room`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
