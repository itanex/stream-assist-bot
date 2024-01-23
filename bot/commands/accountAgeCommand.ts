import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import ICommandHandler, { OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import Timespan, { getAgeReport } from '../utilities/timeSpan';

@injectable()
export class AccountAgeCommand implements ICommandHandler {
    exp: RegExp = /^!(accountage)( [#@]?([a-zA-Z0-9][\w]{2,24}))?$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // get user by name based on either provided or command user name
        const user = await this.apiClient.users
            .getUserByName(args[1]
                ? args[1].toLocaleLowerCase().trim()
                : userstate.userName);

        const ageTimeSpan = Timespan.fromNow(user.creationDate);

        this.chatClient.say(channel, `@${user.displayName} was created ${getAgeReport(ageTimeSpan)}`);

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
