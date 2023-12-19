import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import ICommandHandler from './iCommandHandler';

@injectable()
export class AboutCommand implements ICommandHandler {
    exp: RegExp = /!(about)/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, 'Today I am currently running as a TypeScript entity. My predicessor was only a little JavaScript scriptlet.');

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
