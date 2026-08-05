import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import Timespan, { getAgeReport } from '../utilities/timeSpan';
import { CommandName, TransientContext } from '../utilities/default-responses';
import CommandResponseService from '../utilities/command-response.service';
import { templateResolver } from '../utilities/template-resolver';

@injectable()
export class AccountAgeCommand implements ICommandHandler {
    exp: RegExp = /^!(accountage)(?: [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
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
    commandName: CommandName = 'accountage';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const username = args[0]
            ? args[0].toLocaleLowerCase().trim()
            : userstate.userName;

        const user = await this.apiClient.users.getUserByName(username);

        if (user) {
            const result = this.commandResponseService.getCommandText(this.commandName);

            if (result) {
                const context: TransientContext = {
                    targetuser: user.displayName,
                    accountage: `${getAgeReport(Timespan.fromNow(user.creationDate))}`,
                };

                await this.chatClient.say(channel, templateResolver(result, context, this.logger));
            } else {
                this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
            }
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
