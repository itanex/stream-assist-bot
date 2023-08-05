import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { TYPES } from '../../dependency-management/types';
import ICommandHandler from './iCommandHandler';

let isCollabEnabled = false;

@injectable()
export class CollabAddCommand implements ICommandHandler {
    exp: RegExp = /^!(collab) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (!isCollabEnabled && args[1]) {
            isCollabEnabled = true;

            // eslint-disable-next-line prefer-destructuring
            // collabUsers.push(commandFrags[1]);

            // const user = await apiClient.users.getUserByName(commandFrags[0].toLocaleLowerCase().trim());

            this.chatClient.say(channel, '-- Collaboration Mode enabled -- timythhype');
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class CollabDisableCommand implements ICommandHandler {
    exp: RegExp = /^!(collab) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (isCollabEnabled && args[1]) {
            isCollabEnabled = false;

            // eslint-disable-next-line prefer-destructuring
            // collabUser = commandFrags[1];

            this.chatClient.say(channel, '-- Collaboration Mode disabled -- timythfall');
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class CollabCommand implements ICommandHandler {
    exp: RegExp = /^!(collab) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (isCollabEnabled) {
            // this.chatClient.say(channel, `I am collaborating with https://twitch.tv/${collabUser}`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}