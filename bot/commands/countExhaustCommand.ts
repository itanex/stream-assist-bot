import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class CountExhaustCommand implements ICommandHandler {
    exp: RegExp = /^!(nomoretoes|cantcount|numbershurt)$/i;
    timeout: number = 10;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    responses = [
        `I am about to run out of toes to count on %broadcaster_name%`,
        `I think I need to go back to school to learn more math to count that high`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (this.responses.length) {
            const msg = this.tokenizeMessage(this.responses[Math.floor(Math.random() * this.responses.length)], channel);

            this.chatClient.say(channel, msg);

            this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
        }
    }

    tokenizeMessage(message: string, channel: string): string {
        return message.replace('%broadcaster_name%', channel);
    }
}
