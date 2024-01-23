import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import ICommandHandler, { OnlineState } from './iCommandHandler';

const wishListLink = 'https://jointhrone.com/u/timythetermite';
const responses = [
    `Checkout my Throne wishlist ${wishListLink}`,
    `Want to buy me a gift? ${wishListLink}`,
    `Support the channel, checkout my wishlist on Throne ${wishListLink}`,
];

@injectable()
export class WishListCommand implements ICommandHandler {
    exp: RegExp = /!(wishlist|throne)/i;
    timeout: number = 300;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'always';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (responses.length) {
            this.chatClient.say(channel, responses[Math.floor(Math.random() * responses.length)]);

            this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
        }
    }
}
