import { ApiClient } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import environment from '../../configurations/environment';
import { TYPES } from '../../dependency-management/types';
import ICommandHandler from './iCommandHandler';

@injectable()
export class GiveAwayCommand implements ICommandHandler {
    exp: RegExp = /^!(giveawayrules)$/i;
    timeout: number = 300;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;

    rules: string = `
        GENERAL Giveaway Rules 
        (CAN BE MODIFIED FOR INDIVIDUAL GIVEAWAYS AT ANY TIME): 
        ALL ENTRANTS MUST BE AGE 18 OR OLDER AND FOLLOWING THE CHANNEL. 
        For digital content: you must be willing to share private information, such as an e-mail address. 
        For physical giveaways: You must be willing to provide the broadcaster or a third party with a shipping address. 
        Failure to provide the information within 5 business days may result in forfeiture of the prize and a subsequent redraw.
        `;

    constructor(
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.apiClient.chat.sendAnnouncement(environment.broadcasterId, {
            message: this.rules,
        });

        this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
