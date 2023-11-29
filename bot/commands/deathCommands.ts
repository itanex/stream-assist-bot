import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isToday from 'dayjs/plugin/isToday';
import { inject, injectable, named } from 'inversify';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';
import { IRepository } from '../../repositories/Repositories';
import { GameCountRecord } from '../../repositories/types/GameCountRecord';
import { DeathCountRecord } from '../../repositories/types/DeathCountRecord';
import { CommandTimeout } from '../types/CommandTimeout';
import { Broadcaster } from '../../utilities/broadcaster';
import DeathCounts from '../../database/deathCountRecord.dbo';

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

let commandTimeout: CommandTimeout = { name: 'DeathCommand', timeout: 0 };
// let deathCount = -1;

// time in seconds
const timeout: number = 5 /* minutes */ * 60; /* seconds */

@injectable()
export class DeathCommand implements ICommandHandler {
    exp: RegExp = /^!(death|died)$ /i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    responses = [
        `Timy is finding the quickest way to spawn new Timys`,
        `Timy tried taking on gravity and lost`,
        `Gonna need an abacus for this many deaths`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();

        await DeathCounts
            .findOrCreate({
                where: {
                    streamId: stream.id,
                    gameId: stream.gameId,
                },
                defaults: {
                    deathCount: 1,
                    gameId: stream.gameId,
                    game: stream.gameName,
                    streamId: stream.id,
                },
            })
            .then(async ([instance, created]) => {
                let { deathCount } = instance;

                if (!created) {
                    // eslint-disable-next-line no-param-reassign
                    instance.deathCount++;
                    deathCount = instance.deathCount;
                    await instance.save();
                }

                const ttl = Math.ceil(Math.abs(commandTimeout.timeout - new Date().getTime()) / 1000);

                if (ttl > timeout) {
                    commandTimeout = { name: 'DeathCommand', timeout: new Date().getTime() };
                    this.chatClient.say(channel, `We're gonna need another Timy!`);
                }

                if (this.responses.length && deathCount % 10 === 0) {
                    this.chatClient.say(channel, this.responses[Math.floor(Math.random() * this.responses.length)]);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} :: ${deathCount} || ${userstate.displayName}`);
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
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();

        await DeathCounts
            .findOne({
                where: {
                    streamId: stream.id,
                    gameId: stream.gameId,
                },
            })
            .then(async ({ deathCount }) => {
                if (deathCount > 1) {
                    this.chatClient.say(channel, `We have used ${deathCount} Timy today`);
                } else {
                    this.chatClient.say(channel, `We have used ${deathCount} Timys today`);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} :: ${deathCount} || ${userstate.displayName}`);
            });
    }
}

@injectable()
export class LastDeathCountCommmand implements ICommandHandler {
    exp: RegExp = /!(lastdeathcount)/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    private repository: IRepository<DeathCountRecord>;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        // @inject(TYPES.Repository) @named('DeathRepository') private repository: IRepository<DeathCountRecord>,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        // Read records from data store
        const commands = this.repository.read();

        // Get last death command records filtered: NOT today
        const records = commands
            .filter((x: DeathCountRecord) => !dayjs(x.date).isToday());

        // Get the last record in the set
        const record = records[records.length - 1];

        // If we have a record
        if (record) {
            // Get the game(s) with its count as a string
            const games = record.counts
                .map((value: GameCountRecord) => `${value.game} (${value.deathCount})`)
                .join(', ');

            // Count all deaths for the record
            const many = record.counts
                .flat()
                .flatMap((value: GameCountRecord) => value.deathCount)
                .reduce((prev: number, cur: number) => prev + cur);

            // Report command result to stream
            this.chatClient.say(channel, `During the stream on ${dayjs(record.date).format('ll')}, we used ${many} timys in the following game(s): ${games}`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
    }
}
