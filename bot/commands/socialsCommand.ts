import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import PhraseService from '../utilities/phrase.service';
import { PhraseFamily } from '../utilities/default-phrases';

@injectable()
export class SocialsCommand implements ICommandHandler {
    exp: RegExp = /^!(socials)(?: (\w+))?(?: .+)?$/i;
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
    phraseFamily: PhraseFamily = 'socials';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(PhraseService) private phraseService: PhraseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    cooldownKey(args: string[]): string {
        const [variant] = args as string[];
        const isKnown = !!this.phraseService.getCommandTemplate(this.phraseFamily, variant);

        return !!variant && isKnown ? `${SocialsCommand.name}:${variant}` : SocialsCommand.name;
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [variant] = args as string[];

        const response = this.phraseService.getCommandTemplate(this.phraseFamily, variant);

        if (response) {
            this.chatClient.say(channel, response);
        } else {
            this.logger.warn(`Unknown Variant`, { variant, args, message });
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
