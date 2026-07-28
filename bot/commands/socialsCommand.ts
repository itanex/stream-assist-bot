import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import CommandResponseService from '../utilities/command-response.service';
import { CommandName } from '../utilities/default-responses';

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
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    cooldownKey(args: string[]): string {
        const [variant] = args as string[];
        const isKnown = !!this.commandResponseService.getCommandText(this.commandName, variant);

        return !!variant && isKnown ? `${SocialsCommand.name}:${variant}` : SocialsCommand.name;
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [variant] = args as string[];

        const response = this.commandResponseService.getCommandText(this.commandName, variant);

        if (response) {
            this.chatClient.say(channel, response);
        } else {
            this.logger.warn(`Unknown Variant`, { variant, args, message });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
