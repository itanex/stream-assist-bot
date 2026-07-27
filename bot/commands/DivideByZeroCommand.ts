import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { defaultPhrases, PhraseKey } from '../utilities/default-phrases';
import CommandResponseService from '../utilities/command-response.service';

@injectable()
export class DivideByZeroCommand implements ICommandHandler {
    exp: RegExp = /^!(DivideByZero)$/i;
    phraseKey: PhraseKey = 'dividebyzero';
    timeout: number = 20;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const commandText = this.commandResponseService.getCommandText(this.phraseKey);

        if (!commandText) {
            this.logger.warn(`* Command Text not found for ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
        }

        this.chatClient.say(channel, commandText ?? defaultPhrases.dividebyzero);
        this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
    }
}
