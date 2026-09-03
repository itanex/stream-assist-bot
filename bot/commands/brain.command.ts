import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export default class BrainCommand implements ICommandHandler {
    exp: RegExp = /^!(brain)(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
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
    commandName: CommandName = 'brain';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const result = this.commandResponseService.getCommandText(this.commandName);

        if (result) {
            const targetuser = args[0]
                ? args[0].trim()
                : userstate.displayName;

            const percent = Math.ceil(Math.random() * 100);

            const context: TransientContext = {
                percent: `${percent}`,
                targetuser,
            };

            await this.chatClient.say(channel, templateResolver(result, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
