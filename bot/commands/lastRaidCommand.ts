import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import calendar from 'dayjs/plugin/calendar.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { Raiders } from '../../database/index.js';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class LastRaidCommand implements ICommandHandler {
    exp: RegExp = /^!(lastraid)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await Raiders
            .getLastRaid()
            .then(async record => {
                const lastDate = dayjs(record!.time).fromNow();

                if (record!.viewerCount! > 1) {
                    await this.chatClient.say(channel, `${record!.raider}, raided the colony ${lastDate} with ${record!.viewerCount} viewers!!!`);
                } else {
                    await this.chatClient.say(channel, `${record!.raider}, raided the colony ${lastDate}!!!`);
                }

                this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName}`);
            });
    }
}
