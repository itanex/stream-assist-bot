import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { CommandName, TransientContext } from '../utilities/default-responses';
import CommandResponseService from '../utilities/command-response.service';
import { templateResolver } from '../utilities/template-resolver';

@injectable()
export class CuddleCommand implements ICommandHandler {
    exp: RegExp = /^!(cuddle) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
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
    commandName: CommandName = 'cuddle';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const targetUsername = args[0]?.toLocaleLowerCase().trim();

        if (targetUsername) {
            const targetUser = await this.apiClient.users.getUserByName(targetUsername);

            if (targetUser && userstate.displayName !== targetUser.displayName) {
                const result = this.commandResponseService.getCommandText(this.commandName);

                if (result) {
                    const context: TransientContext = {
                        speakinguser: userstate.displayName,
                        targetuser: targetUser.displayName,
                    };

                    this.chatClient.say(channel, templateResolver(result, context, this.logger));
                } else {
                    this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
                }
            }
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
