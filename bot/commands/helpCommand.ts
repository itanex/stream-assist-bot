import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { TYPES } from '../../dependency-management/types';
import ICommandHandler from './iCommandHandler';

@injectable()
export class HelpCommand implements ICommandHandler {
    exp: RegExp = /^!(help)$/i;
    timeout: number = 15;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;

    helpResponses = [
        `I am stuck in this corner and unable to assist you at this time?`,
        `I could really use some help right now. Do you know where I can find a butter knife?`,
        `HELP!`,
        `I am afraid I can't do that`,
        `Are you... my friend?`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, this.helpResponses[Math.floor(Math.random() * this.helpResponses.length)]);

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
