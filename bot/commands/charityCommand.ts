import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

@injectable()
export class CharityCommand implements ICommandHandler {
    exp: RegExp = /^!(extralife)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, `Please help support the Extra Life Charity. 
        My supported Children's Hospital is Spokane Sacred Heart Children's Hospital.
        https://www.extra-life.org/index.cfm?fuseaction=donorDrive.Participant&participantID=473268#donate
        `);

        this.logger.info(`* Executed ${commandName} || ${userstate.displayName} > ${message}`);
    }
}
