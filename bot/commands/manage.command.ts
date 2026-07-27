import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import CommandResponseService, {
    CommandTextValidationResult,
    CommandTextInsertResult,
    CommandTextUpdateResult,
} from '../utilities/command-response.service';

export const GenericReplies: Record<CommandTextValidationResult, (name: string) => string> = {
    invalidInput: () => 'Invalid input: both [name] and [text] are required',
    invalidText: name => `Invalid text for command '${name}'`,
};

export const InsertReplies: Record<CommandTextInsertResult, (name: string) => string> = {
    ...GenericReplies,
    alreadyExists: name => `Command ${name} text already exists`,
    invalidCommandName: name => `Command ${name} text family is not recognized`,
    inserted: name => `Command ${name} text was inserted`,
};

export const UpdateReplies: Record<CommandTextUpdateResult, (name: string) => string> = {
    ...GenericReplies,
    notEditable: name => `Command ${name} does not have an editable text`,
    updated: name => `Command ${name} text was updated`,
    updateFailed: name => `Command ${name} text failed to update`,
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
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [subCommand, compoundName, text] = args as string[];
        const [name, variant, ...rest] = compoundName.split('.');

        if (rest.length > 0) {
            this.chatClient.say(channel, UnsupportedMessage(compoundName));
            this.logger.warn(UnsupportedMessage(compoundName));
        } else {
            // eslint-disable-next-line default-case
            switch (subCommand.toLowerCase()) {
                case 'add': {
                    const result = await this.commandResponseService.addCommandText(name, text, variant);
                    this.chatClient.say(channel, InsertReplies[result](compoundName));
                    break;
                }
                case 'edit': {
                    const result = await this.commandResponseService.setCommandText(name, text, variant);
                    this.chatClient.say(channel, UpdateReplies[result](compoundName));
                    break;
                }
            }
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
