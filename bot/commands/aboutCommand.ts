import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName, defaultResponses } from '../utilities/default-responses.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export class AboutCommand implements ICommandHandler {
    exp: RegExp = /!(about)/i;
    commandName: CommandName = 'about';
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const commandText = this.commandResponseService.getCommandText(this.commandName);

        if (!commandText) {
            this.logger.warn(`* Command Text not found for ${command} in ${channel} || ${userstate.displayName} > ${message}`);
        }

        await this.chatClient.say(channel, commandText ?? defaultResponses.about['']);
        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
