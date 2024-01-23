import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import ICommandHandler, { OnlineState } from './iCommandHandler';

@injectable()
export class FallCommand implements ICommandHandler {
    exp: RegExp = /!(fall|fell)/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    responses = [
        `Timy go down the hooooole!`,
        `UH. Did Timy just fall down again?`,
        `What? Is Timy down the again?! Better get @slopez!`,
        `Hurry, I think Timy fell off the track again.`,
        `Timy doesn't fall down. He just explores the new frontiers of the latest and greatest games.`,
        `Timy didn't fall, he just doesn't understand level boundaries.`,
        `Timy didn't fall, he's trying new ways to play.`,
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
