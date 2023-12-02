import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';
import Raiders from '../../database/raiders.dbo';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class LastRaidCommand implements ICommandHandler {
    exp: RegExp = /^!(lastraid)$/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await Raiders
            .findOne({
                order: [['time', 'DESC']],
            })
            .then(record => {
                const lastDate = dayjs(record.time).fromNow();

                if (record.viewerCount > 1) {
                    this.chatClient.say(channel, `${record.raider}, raided the colony ${lastDate} with ${record.viewerCount} viewers!!!`);
                } else {
                    this.chatClient.say(channel, `${record.raider}, raided the colony ${lastDate}!!!`);
                }

                this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName}`);
            });
    }
}
