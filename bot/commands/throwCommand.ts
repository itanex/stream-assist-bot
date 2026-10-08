import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export default class ThrowCommand implements ICommandHandler {
    exp: RegExp = /^!(throw) ([\w\s]{2,48})(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
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
    commandName: CommandName = 'throw';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const variant = args[1] ? '' : 'room';
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, variant);

        if (commandText) {
            const context: TransientContext = {
                speakinguser: userstate.displayName,
                item: args[0],
                targetuser: args[1],
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
