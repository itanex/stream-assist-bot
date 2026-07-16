import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import PhraseService, { PhraseUpdateResult } from '../utilities/phrase.service';

export const replies: Record<PhraseUpdateResult, (name: string) => string> = {
    updated: name => `Command ${name} phrase was updated`,
    updateFailed: name => `Command ${name} phrase failed to update`,
    invalidInput: () => 'Invalid input: both [name] and [template] are required',
    invalidTemplate: name => `Invalid template for command '${name}'.`,
    notEditable: name => `Command ${name} does not have an editable phrase`,
};

//
// Suggested Trigger: !command <verb> <name> [args]
//
@injectable()
export default class ManageCommand implements ICommandHandler {
    exp: RegExp = /^!(command|cmd) edit ([\w.]+) (.+)$/i;
    timeout: number = 10;
    mod: boolean = true;
    vip: boolean = false;
    artist: boolean = false;
    founder: boolean = false;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = false;
    restriction: OnlineState = 'always';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(PhraseService) private phraseService: PhraseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const name = args[0];
        const template = args[1];

        const result = await this.phraseService.setCommandTemplate(name, template);

        this.chatClient.say(channel, replies[result](name));

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
