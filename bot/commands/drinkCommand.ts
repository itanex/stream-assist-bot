import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { defaultPhrases, PhraseKey } from '../utilities/default-phrases';
import PhraseService from '../utilities/phrase.service';

@injectable()
export class DrinkCommand implements ICommandHandler {
    exp: RegExp = /^!(drink|drinkorperish)$/i;
    phraseKey: PhraseKey = 'drink';
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

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(PhraseService) private phraseService: PhraseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const commandTemplate = this.phraseService.getCommandTemplate(this.phraseKey);

        if (!commandTemplate) {
            this.logger.warn(`* Command Phrase not found for ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
        }

        this.chatClient.say(channel, commandTemplate ?? defaultPhrases.drink);
        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
