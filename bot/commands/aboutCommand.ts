import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import CommandResponseService from '../utilities/command-response.service';
import { defaultPhrases, PhraseKey } from '../utilities/default-phrases';

@injectable()
export class AboutCommand implements ICommandHandler {
    exp: RegExp = /!(about)/i;
    phraseKey: PhraseKey = 'about';
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

        this.chatClient.say(channel, commandText ?? defaultPhrases.about);
        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
