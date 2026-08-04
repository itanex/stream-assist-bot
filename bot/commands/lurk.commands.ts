import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { CommandName, defaultResponses, TransientContext } from '../utilities/default-responses';
import CommandResponseService from '../utilities/command-response.service';
import { templateResolver } from '../utilities/template-resolver';
import LurkRespository from '../utilities/lurk.respository';

@injectable()
export class LurkCommand implements ICommandHandler {
    exp: RegExp = /^!(lurk)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'lurk';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(LurkRespository) private lurkRespository: LurkRespository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [user, created] = await this.lurkRespository.setUserToLurk(userstate);

        if (created) {
            const result = this.commandResponseService.getCommandText(this.commandName);

            const context: TransientContext = {
                speakinguser: user.displayName,
            };

            this.chatClient.say(channel, templateResolver(result ?? defaultResponses.lurk, context, this.logger));
        }

        // Don't say anything if the user is already lurking
        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class UnLurkCommand implements ICommandHandler {
    exp: RegExp = /^!(unlurk)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'unlurk';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(LurkRespository) private lurkRespository: LurkRespository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const unlurkedUser = await this.lurkRespository.setUserToUnlurk(userstate);

        if (unlurkedUser) {
            const result = this.commandResponseService.getCommandText(this.commandName);
            const context: TransientContext = {
                speakinguser: unlurkedUser.displayName,
                lurkduration: unlurkedUser.duration().humanize(),
            };

            // Report the command result
            this.chatClient.say(channel, templateResolver(result ?? defaultResponses.unlurk, context, this.logger));
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class WhoIsLurkingCommand implements ICommandHandler {
    exp: RegExp = /^!(whoislurking|lurking)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = false;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(LurkRespository) private lurkRepository: LurkRespository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const records = await this.lurkRepository.getAllLurkingUsers();

        const users = records.map(x => x.displayName);
        const lastUser = users.pop();

        switch (records.length) {
            case 0:
                this.chatClient.say(channel, 'There are no users currenlty lurking in the channel');
                break;
            case 1:
                this.chatClient.say(channel, `There is ${records.length} user lurking: ${lastUser}`);
                break;
            case 2:
                this.chatClient.say(channel, `There are ${records.length} users lurking: ${users[0]} and ${lastUser}`);
                break;
            case 3:
            case 4:
            case 5:
                this.chatClient.say(channel, `There are ${records.length} users lurking: ${users.join(', ')}, and ${lastUser}`);
                break;
            default:
                this.chatClient.say(channel, `There are ${records.length} users lurking.`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

export async function clearLurkingUsers(
    lurkRepository: LurkRespository,
    logger: winston.Logger,
): Promise<void> {
    const [count, users] = await lurkRepository.setAllUsersToUnlurk();

    if (count > 0) {
        logger.info(`DataStore:: Cleaned up Lurking Users from stream: ${users.map(x => x.displayName).join(', ')}`);
    }
}
