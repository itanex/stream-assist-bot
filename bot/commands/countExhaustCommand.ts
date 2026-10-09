import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { type CommandName, TransientContext } from '../utilities/default-responses.js';
import Broadcaster from '../utilities/broadcaster.js';
import CommandResponseService from '../services/command-response.service.js';

@injectable()
export class CountExhaustCommand implements ICommandHandler {
    exp: RegExp = /^!(nomoretoes|cantcount|numbershurt)$/i;
    commandName: CommandName = 'countExhaust';
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

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, '');

        if (commandText) {
            const broadcaster = await this.broadcaster.getBroadcaster();

            const context: TransientContext = {
                broadcaster: broadcaster.displayName,
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
        }

        this.logger.info(`* Executed ${command} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
