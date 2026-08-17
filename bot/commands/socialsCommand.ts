import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import CommandResponseRepository from '../repositories/command-response.repository.js';
import { CommandName } from '../utilities/default-responses.js';

@injectable()
export class SocialsCommand implements ICommandHandler {
    exp: RegExp = /^!(socials)(?: (\w+))?(?: .+)?$/i;
    commandName: CommandName = 'socials';
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'always';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseRepository) private commandResponseRepository: CommandResponseRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    cooldownKey(args: string[]): string {
        const [variant] = args as string[];
        const isKnown = !!this.commandResponseRepository.getCommandText(this.commandName, variant);

        return !!variant && isKnown ? `${SocialsCommand.name}:${variant}` : SocialsCommand.name;
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [variant] = args as string[];

        const response = this.commandResponseRepository.getCommandText(this.commandName, variant);

        if (response) {
            await this.chatClient.say(channel, response);
        } else {
            this.logger.warn(`Unknown Variant`, { variant, args, message });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
