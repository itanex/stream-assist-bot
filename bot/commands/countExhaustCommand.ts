import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import environment from '../../configurations/environment';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class CountExhaustCommand implements ICommandHandler {
    exp: RegExp = /^!(nomoretoes|cantcount|numbershurt)$/i;
    timeout: number = 10;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    responses = [
        `I am about to run out of toes to count on ${environment.twitchBot.broadcaster}`,
        `I think I need to go back to school to learn more math to count that high`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (this.responses.length) {
            this.chatClient.say(channel, this.responses[Math.floor(Math.random() * this.responses.length)]);

            this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
        }
    }
}
