import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { CommandName, defaultResponses } from '../utilities/default-responses';
import CommandResponseService from '../utilities/command-response.service';

@injectable()
export class DrinkCommand implements ICommandHandler {
    exp: RegExp = /^!(drink|drinkorperish)$/i;
    commandName: CommandName = 'drink';
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
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

        await this.chatClient.say(channel, commandText ?? defaultResponses.drink);
        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
