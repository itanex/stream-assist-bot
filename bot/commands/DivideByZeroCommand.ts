import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import ICommandHandler, { OnlineState } from './iCommandHandler';

@injectable()
export class DivideByZeroCommand implements ICommandHandler {
    exp: RegExp = /^!(DivideByZero)$/i;
    timeout: number = 20;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, `Sorry I am too smart for your silly games!`);

        this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
