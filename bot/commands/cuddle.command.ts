import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import CommandResponseRepository from '../repositories/command-response.repository.js';
import { templateResolver } from '../utilities/template-resolver.js';

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
        @inject(CommandResponseRepository) private commandResponseRepository: CommandResponseRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const targetUsername = args[0]?.toLocaleLowerCase().trim();

        if (targetUsername) {
            const targetUser = await this.apiClient.users.getUserByName(targetUsername);

            if (targetUser && userstate.displayName !== targetUser.displayName) {
                const result = this.commandResponseRepository.getCommandText(this.commandName);

                if (result) {
                    const context: TransientContext = {
                        speakinguser: userstate.displayName,
                        targetuser: targetUser.displayName,
                    };

                    await this.chatClient.say(channel, templateResolver(result, context, this.logger));
                } else {
                    this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
                }
            }
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
