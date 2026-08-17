import { inject, injectable } from 'inversify';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import CommandResponseRepository, {
    CommandTextValidationResult,
    CommandTextInsertResult,
    CommandTextUpdateResult,
    CommandTextRemoveResult,
    CommandTextRestoreResult,
} from '../repositories/command-response.repository.js';

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

export const RemoveReplies: Record<CommandTextRemoveResult, (name: string) => string> = {
    ...GenericReplies,
    notFound: name => `Command ${name} was not found`,
    removed: name => `Command ${name} was removed`,
    removeFailed: name => `Command ${name} failed to be removed`,
};

export const RestoreReplies: Record<CommandTextRestoreResult, (name: string) => string> = {
    ...GenericReplies,
    notFound: name => `Command ${name} was not found`,
    restored: name => `Command ${name} was restored`,
    alreadyActive: name => `Command ${name} is already active`,
};

export const UnsupportedMessage = (name: string) => `${name} is not a valid command`;

//
// Suggested Trigger: !command <verb> <name> [args]
//
@injectable()
export default class ManageCommand implements ICommandHandler {
    exp: RegExp = /^!(command|cmd) (add|edit|remove|restore) ([\w.]+)(?: (.+))?$/i;
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
        @inject(CommandResponseRepository) private commandResponseRepository: CommandResponseRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const [subCommand, compoundName, text] = args as string[];
        const [name, variant, ...rest] = compoundName.split('.');

        if (rest.length > 0) {
            await this.chatClient.say(channel, UnsupportedMessage(compoundName));
            this.logger.warn(UnsupportedMessage(compoundName));
        } else {
            // eslint-disable-next-line default-case
            switch (subCommand.toLowerCase()) {
                case 'add': {
                    const result = await this.commandResponseRepository.addCommandText(name, text, variant);
                    await this.chatClient.say(channel, InsertReplies[result](compoundName));
                    break;
                }
                case 'edit': {
                    const result = await this.commandResponseRepository.setCommandText(name, text, variant);
                    await this.chatClient.say(channel, UpdateReplies[result](compoundName));
                    break;
                }
                case 'remove': {
                    const result = await this.commandResponseRepository.removeCommandText(name, variant);
                    await this.chatClient.say(channel, RemoveReplies[result](compoundName));
                    break;
                }
                case 'restore': {
                    const result = await this.commandResponseRepository.restoreCommandText(name, variant);
                    await this.chatClient.say(channel, RestoreReplies[result](compoundName));
                    break;
                }
            }
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
