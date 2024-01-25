import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import environment from '../../configurations/environment';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class SocialsCommand implements ICommandHandler {
    exp: RegExp = /^!(socials)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'always';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const msg = `
            Discord ${environment.discordInvite},
            The social media site formerly known as Twitter ${environment.twitter.link},
            and 
            YouTube ${environment.youtube.link}.
            `;

        this.chatClient.say(channel, msg);

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
