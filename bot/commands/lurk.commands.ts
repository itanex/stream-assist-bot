import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';
import LurkRespository from '../repositories/lurk.respository.js';

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
            const commandText = this.commandResponseService
                .getCommandResponse(this.commandName, '');

            if (commandText) {
                const context: TransientContext = {
                    speakinguser: user.displayName,
                };

                await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
            } else {
                this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
            }
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
            const commandText = this.commandResponseService
                .getCommandResponse(this.commandName, '');

            if (commandText) {
                const context: TransientContext = {
                    speakinguser: unlurkedUser.displayName,
                    lurkduration: unlurkedUser.duration().humanize(),
                };

                // Report the command result
                await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
            } else {
                this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
            }
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
    commandName: CommandName = 'whoislurking';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(LurkRespository) private lurkRepository: LurkRespository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const records = await this.lurkRepository.getAllLurkingUsers();

        const users = records.map(x => x.displayName);
        const lastUser = users.pop();

        let variant: string;

        switch (records.length) {
            case 0:
                variant = 'none';
                break;
            case 1:
                variant = 'one';
                break;
            case 2:
                variant = 'two';
                break;
            case 3:
            case 4:
            case 5:
                variant = 'few';
                break;
            default:
                variant = 'many';
        }

        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, variant);

        if (commandText) {
            const context: TransientContext = {
                total: `${records.length}`,
                users: users.join(', '),
                lastuser: lastUser ?? '',
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
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
