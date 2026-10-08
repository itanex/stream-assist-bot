import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export class HugCommand implements ICommandHandler {
    exp: RegExp = /^!(hug|hugs)(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'hug';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        let variant = 'self';
        let targetuser = userstate.displayName;

        if (args[0]) {
            const user = await this.apiClient.users.getUserByName(args[0]);

            if (!user) {
                variant = 'notfound';
                [targetuser] = args;
            } else if (userstate.displayName !== user.displayName) {
                variant = '';
                targetuser = user.displayName;
            }
        }

        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, variant);

        if (commandText) {
            const context: TransientContext = {
                speakinguser: userstate.displayName,
                targetuser,
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
