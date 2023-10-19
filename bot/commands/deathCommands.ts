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

dayjs.extend(localizedFormat);
dayjs.extend(isToday);

let commandTimeout: CommandTimeout = { name: 'DeathCommand', timeout: 0 };
let deathCount = -1;

// time in seconds
const timeout: number = 5 /* minutes */ * 60; /* seconds */

@injectable()
export class DeathCommand implements ICommandHandler {
    exp: RegExp = /!(death|died)/i;
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

    private repository: IRepository<DeathCountRecord>;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        // @inject(TYPES.Repository) @named('DeathRepository') private repository: IRepository<DeathCountRecord>,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();
        const date = dayjs().format('YYYY-MM-DD');

        // get record for today from database
        const records = this.repository.read();

        // did we get ANY records
        if (records.length > 0) {
            const index = records.findIndex((value: DeathCountRecord) => value.date === date);

            // There is NO record for today
            if (index === -1) {
                // Record new Deathcount for today
                this.createDeathRecord(stream.gameName);
                deathCount = 1;
            } else {
                // There is a record for today
                const record = records[index].counts.find((value: GameCountRecord) => value.game === stream.gameName);
                deathCount = ++record.deathCount;

                this.repository.update(index, record[index]);
            }
        } else {
            // Record new Deathcount for today
            this.createDeathRecord(stream.gameName);
            deathCount = 1;
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
    }

    private createDeathRecord(gameName: string) {
        this.repository.create({
            date: dayjs().format('YYYY-MM-DD'),
            counts: [{
                deathCount: 1,
                game: gameName,
            }],
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
    private repository: IRepository<DeathCountRecord>;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        // @inject(TYPES.Repository) @named('DeathRepository') private repository: IRepository<DeathCountRecord>,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();
        const date = dayjs().format('YYYY-MM-DD');

        if (deathCount === -1) {
            deathCount = this.repository.read()
                .find((value: DeathCountRecord) => value.date === date)
                ?.counts
                ?.find((value: GameCountRecord) => value.game === stream.gameName)
                ?.deathCount || 0;
        }

        this.chatClient.say(channel, `We have used ${deathCount} Timy(s) today`);

        this.logger.info(`* Executed ${commandName} in ${channel} :: ${deathCount} || ${userstate.displayName}`);
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
