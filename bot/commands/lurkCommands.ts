import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { TYPES } from '../../dependency-management/types';
import ICommandHandler from './iCommandHandler';

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

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // const record = Repository
        //     .readCollection<LurkingUser>(DataKeys.LurkingUser)
        //     .map(mapToLurkingUser)
        //     // TODO: Enhance filter to account for todays stream
        //     .filter((x: LurkingUser) => x.isLurking() && x.userId === userstate.userId)[0];

        // // If no user exists create record
        // if (!record) {
        //     Repository.create<LurkingUser>(DataKeys.LurkingUser, new LurkingUser(
        //         userstate.displayName,
        //         userstate.userId,
        //         new Date(),
        //     ));

        //     // Report the command result
        //     this.chatClient.say(channel, `OK, ${userstate.displayName} see you when you get back`);
        // }

        // // Don't say anything if the user is already lurking
        // this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
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

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // const records = Repository
        //     .readCollection<LurkingUser>(DataKeys.LurkingUser)
        //     .map(mapToLurkingUser);

        // const record = records
        //     // TODO: Enhance filter to account for todays stream
        //     .filter((x: LurkingUser) => x.isLurking() && x.userId === userstate.userId)[0];

        // const index = records.findIndex((item: LurkingUser) => item === record);

        // if (record) {
        //     record.endTime = new Date();
        //     Repository.update<LurkingUser>(DataKeys.LurkingUser, index, record);

        //     // Report the command result
        //     this.chatClient.say(channel, `Welcome back, ${record.displayName}. You were gone for ${record.duration().humanize()}`);
        // }

        // this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
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

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // const records = Repository
        //     .readCollection<LurkingUser>(DataKeys.LurkingUser)
        //     .map(mapToLurkingUser)
        //     .filter(user => user.isLurking());

        // const users = records.map(x => x.displayName);
        // const lastUser = users.pop();

        // switch (records.length) {
        //     case 0:
        //         this.chatClient.say(channel, 'There are no users currenlty lurking in the channel');
        //         break;
        //     case 1:
        //         this.chatClient.say(channel, `There is ${records.length} user lurking: ${lastUser}`);
        //         break;
        //     case 2:
        //         this.chatClient.say(channel, `There are ${records.length} users lurking: ${users[0]} and ${lastUser}`);
        //         break;
        //     case 3:
        //     case 4:
        //     case 5:
        //         this.chatClient.say(channel, `There are ${records.length} users lurking: ${users.join(', ')}, and ${lastUser}`);
        //         break;
        //     default:
        //         this.chatClient.say(channel, `There are ${records.length} users lurking.`);
        // }

        // this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}

// function mapToLurkingUser(record: LurkingUser): LurkingUser {
//     const item = new LurkingUser(record.displayName, record.userId, record.startTime);
//     // eslint-disable-next-line dot-notation
//     item.endTime = record['_endTime'];

//     return item;
// }

export async function clearLurkingUsers(): Promise<void> {
    // const records = Repository
    //     .readCollection<LurkingUser>(DataKeys.LurkingUser)
    //     .map(mapToLurkingUser);

    // const still: LurkingUser[] = [];

    // for (let index = 0; index < records.length; index++) {
    //     if (!records[index].isLurking()) {
    //         continue;
    //     }

    //     records[index].endTime = new Date();
    //     still.push(records[index]);

    //     Repository.update<LurkingUser>(DataKeys.LurkingUser, index, records[index]);
    // }

    // logger.info(`DataStore:: Cleaned up Lurking Users from stream: ${still.map(x => x.displayName).join(', ')}`);
}