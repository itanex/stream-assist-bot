import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import { LurkingUsers } from '../../database';

@injectable()
export class LurkCommand implements ICommandHandler {
    exp: RegExp = /^!(lurk)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await LurkingUsers
            .setUserToLurk(userstate)
            .then(([instance, created]) => {
                if (created) {
                    this.chatClient.say(channel, `OK, ${instance.displayName} see you when you get back`);
                }
            });

        // Don't say anything if the user is already lurking
        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class UnLurkCommand implements ICommandHandler {
    exp: RegExp = /^!(unlurk)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await LurkingUsers
            .setUserToUnlurk(userstate)
            .then(async record => {
                if (record) {
                    // eslint-disable-next-line no-param-reassign
                    record.endTime = new Date();

                    const x = await record.save();

                    // Report the command result
                    this.chatClient.say(channel, `Welcome back, ${x.displayName}. You were gone for ${x.duration().humanize()}`);
                }
            });

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

@injectable()
export class WhoIsLurkingCommand implements ICommandHandler {
    exp: RegExp = /^!(whoislurking|lurking)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await LurkingUsers
            .getAllLurkingUsers()
            .then(records => {
                const users = records.map(x => x.displayName);
                const lastUser = users.pop();

                switch (records.length) {
                    case 0:
                        this.chatClient.say(channel, 'There are no users currenlty lurking in the channel');
                        break;
                    case 1:
                        this.chatClient.say(channel, `There is ${records.length} user lurking: ${lastUser}`);
                        break;
                    case 2:
                        this.chatClient.say(channel, `There are ${records.length} users lurking: ${users[0]} and ${lastUser}`);
                        break;
                    case 3:
                    case 4:
                    case 5:
                        this.chatClient.say(channel, `There are ${records.length} users lurking: ${users.join(', ')}, and ${lastUser}`);
                        break;
                    default:
                        this.chatClient.say(channel, `There are ${records.length} users lurking.`);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
            });
    }
}

// @injectable()
export async function clearLurkingUsers(
    logger: winston.Logger,
): Promise<void> {
    await LurkingUsers
        .setAllUsersToUnlurk()
        .then(([count, users]) => {
            if (count > 0) {
                logger.info(`DataStore:: Cleaned up Lurking Users from stream: ${users.map(x => x.displayName).join(', ')}`);
            }
        });
}
