import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import PhraseService, { PhraseGenericResult, PhraseInsertResult, PhraseUpdateResult } from '../utilities/phrase.service';

export const GenericReplies: Record<PhraseGenericResult, (name: string) => string> = {
    invalidInput: () => 'Invalid input: both [name] and [template] are required',
    invalidTemplate: name => `Invalid template for command '${name}'`,
};

export const InsertReplies: Record<PhraseInsertResult, (name: string) => string> = {
    ...GenericReplies,
    alreadyExists: name => `Command ${name} phrase already exists`,
    invalidCommandName: name => `Command ${name} phrase family is not recognized`,
    inserted: name => `Command ${name} phrase was inserted`,
};

export const UpdateReplies: Record<PhraseUpdateResult, (name: string) => string> = {
    ...GenericReplies,
    notEditable: name => `Command ${name} does not have an editable phrase`,
    updated: name => `Command ${name} phrase was updated`,
    updateFailed: name => `Command ${name} phrase failed to update`,
};

export const UnsupportedMessage = (name: string) => `${name} is not a valid command`;

//
// Suggested Trigger: !command <verb> <name> [args]
//
@injectable()
export default class ManageCommand implements ICommandHandler {
    exp: RegExp = /^!(command|cmd) (add|edit) ([\w.]+) (.+)$/i;
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
        const [subCommand, compoundName, template] = args as string[];
        const [name, variant, ...rest] = compoundName.split('.');

        if (rest.length > 0) {
            this.chatClient.say(channel, UnsupportedMessage(compoundName));
            this.logger.warn(UnsupportedMessage(compoundName));
        } else {
            // eslint-disable-next-line default-case
            switch (subCommand.toLowerCase()) {
                case 'add': {
                    const result = await this.phraseService.addCommandTemplate(name, template, variant);
                    this.chatClient.say(channel, InsertReplies[result](compoundName));
                    break;
                }
                case 'edit': {
                    const result = await this.phraseService.setCommandTemplate(name, template, variant);
                    this.chatClient.say(channel, UpdateReplies[result](compoundName));
                    break;
                }
            }
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
