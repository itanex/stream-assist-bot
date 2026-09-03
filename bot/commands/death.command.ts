import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import isToday from 'dayjs/plugin/isToday.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ApiClient } from '@twurple/api';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandTimeout } from '../types/CommandTimeout.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';
import DeathCountRepository from '../repositories/death-count.repository.js';

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
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    private commandTimeout: CommandTimeout = { name: 'DeathCommand', timeout: 0 };

    private initialResponse = `We're gonna need another Timy!`;
    private responses = [
        `Timy is finding the quickest way to spawn new Timys`,
        `Timy tried taking on gravity and lost`,
        `Gonna need an abacus for this many deaths`,
    ];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(DeathCountRepository) private deathCountRepository: DeathCountRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const stream = await this.apiClient.streams.getStreamByUserName(channel.replace('#', ''));

        if (stream) {
            const record = await this.deathCountRepository
                .recordNewDeath(stream);

            if (record) {
                const ttl = Math.ceil(Math.abs(this.commandTimeout.timeout - new Date().getTime()) / 1000);

                if (ttl > timeout) {
                    this.commandTimeout = { name: 'DeathCommand', timeout: new Date().getTime() };

                    if (record.deathCount === 1) {
                        await this.chatClient.say(channel, this.initialResponse);
                    }
                } else if (this.responses.length && record.deathCount % 10 === 0) {
                    this.commandTimeout = { name: 'DeathCommand', timeout: new Date().getTime() };
                    await this.chatClient.say(channel, this.responses[Math.floor(Math.random() * this.responses.length)]);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${record.deathCount}`);
            }
        }
    }
}

@injectable()
export class DeathCountCommand implements ICommandHandler {
    exp: RegExp = /^!(death[-]?count)$/i;
    timeout: number = 20;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(DeathCountRepository) private deathCountRepository: DeathCountRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const stream = await this.apiClient.streams.getStreamByUserName(channel.replace('#', ''));

        if (stream) {
            const record = await this.deathCountRepository
                .getCurrentStreamDeathCount(stream);

            if (record) {
                if (record.deathCount === 1) {
                    await this.chatClient.say(channel, `We have used ${record.deathCount} Timy today`);
                } else {
                    await this.chatClient.say(channel, `We have used ${record.deathCount} Timys today`);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${record.deathCount}`);
            }
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
    }
}

@injectable()
export class LastDeathCountCommmand implements ICommandHandler {
    exp: RegExp = /^!(lastdeathcount)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'lastdeathcount';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(DeathCountRepository) private deathCountRepository: DeathCountRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const stream = await this.apiClient.streams.getStreamByUserName(channel.replace('#', ''));

        if (stream) {
            const records = await this.deathCountRepository
                .getLastStreamDeathCount(stream.id);

            const result = this.commandResponseService.getCommandText(this.commandName);

            if (result) {
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

                const context: TransientContext = {
                    deathtotal: `${total}`,
                    streamdate: `${dayjs(date).format('ll')}`,
                    streamcategory: games,
                };

                // Report command result to stream
                await this.chatClient.say(channel, templateResolver(result, context, this.logger));
            } else {
                this.logger.warn(`Unable to retrieve ${this.commandName} response text`);
            }
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
    }
}
