import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName } from '../utilities/default-responses.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export class DivideByZeroCommand implements ICommandHandler {
    exp: RegExp = /^!(DivideByZero)$/i;
    commandName: CommandName = 'dividebyzero';
    timeout: number = 20;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
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
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, '');

        if (commandText) {
            await this.chatClient.say(channel, commandText);
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
        }

        this.logger.info(`* Executed ${command} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
