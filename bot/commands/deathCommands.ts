import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import { CommandTimeout } from '../types/CommandTimeout';
import Broadcaster from '../utilities/broadcaster';
import { DeathCounts } from '../../database';

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

// time in seconds
const timeout: number = 5 /* minutes */ * 60; /* seconds */

@injectable()
export class DeathCommand implements ICommandHandler {
    exp: RegExp = /^!(death|died)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    private commandTimeout: CommandTimeout = { name: 'DeathCommand', timeout: 0 };

    responses = [
        `Timy is finding the quickest way to spawn new Timys`,
        `Timy tried taking on gravity and lost`,
        `Gonna need an abacus for this many deaths`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();

        await DeathCounts
            .recordNewDeath(stream)
            .then(async ([instance, created]) => {
                let { deathCount } = instance;

                if (!created) {
                    // eslint-disable-next-line no-param-reassign
                    instance.deathCount++;
                    deathCount = instance.deathCount;
                    await instance.save();
                }

                const ttl = Math.ceil(Math.abs(this.commandTimeout.timeout - new Date().getTime()) / 1000);

                if (ttl > timeout) {
                    this.commandTimeout = { name: 'DeathCommand', timeout: new Date().getTime() };

                    if (deathCount === 1) {
                        this.chatClient.say(channel, `We're gonna need another Timy!`);
                    } else if (this.responses.length) {
                        this.chatClient.say(channel, this.responses[Math.floor(Math.random() * this.responses.length)]);
                    }
                } else if (this.responses.length && deathCount % 10 === 0) {
                    this.commandTimeout = { name: 'DeathCommand', timeout: new Date().getTime() };
                    this.chatClient.say(channel, this.responses[Math.floor(Math.random() * this.responses.length)]);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${deathCount}`);
            });
    }
}

@injectable()
export class DeathCountCommand implements ICommandHandler {
    exp: RegExp = /^!(death[-]?count)$/i;
    timeout: number = 20;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();

        await DeathCounts
            .getCurrentStreamDeathCount(stream)
            .then(async ([instance]) => {
                if (instance.deathCount > 1) {
                    this.chatClient.say(channel, `We have used ${instance.deathCount} Timy today`);
                } else {
                    this.chatClient.say(channel, `We have used ${instance.deathCount} Timys today`);
                }
                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${instance.deathCount}`);
            });
    }
}

@injectable()
export class LastDeathCountCommmand implements ICommandHandler {
    exp: RegExp = /^!(lastdeathcount)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();

        await DeathCounts
            .getLastStreamDeathCount(stream.id)
            .then(records => {
                const games = records
                    .map(record => `${record.game} (${record.deathCount})`)
                    .join(', ');

                const total = records
                    .flat()
                    .flatMap(value => value.deathCount)
                    .reduce((prev: number, cur: number) => prev + cur);

                const date = records
                    .map(record => record.createdAt)
                    .shift();

                // Report command result to stream
                this.chatClient.say(channel, `During the stream on ${dayjs(date).format('ll')}, we used ${total} timys in the following game(s): ${games}`);
            });

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
    }
}
