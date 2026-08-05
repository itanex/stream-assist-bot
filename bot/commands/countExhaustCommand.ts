import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { templateResolver } from '../utilities/template-resolver';
import { TransientContext, transientKeywords } from '../utilities/default-responses';
import Broadcaster from '../utilities/broadcaster';

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
        `I am about to run out of toes to count on %${transientKeywords.broadcaster}%`,
        `I think I need to go back to school to learn more math to count that high`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (this.responses.length) {
            const result = this.responses[Math.floor(Math.random() * this.responses.length)];
            const broadcaster = await this.broadcaster.getBroadcaster();

            const context: TransientContext = {
                broadcaster: broadcaster.displayName,
            };

            await this.chatClient.say(channel, templateResolver(result, context, this.logger));
        }

        this.logger.info(`* Executed ${command} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
