import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';
import Broadcaster from '../utilities/broadcaster';

dayjs.extend(relativeTime);

@injectable()
export class UpTimeCommand implements ICommandHandler {
    exp: RegExp = /!(uptime)/i;
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
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();
        const startDate = dayjs(stream.startDate);

        if (stream.type === 'live') {
            this.chatClient.say(channel, `${(broadcaster.displayName)} has been online for ${startDate.fromNow(true)}`);
        } else {
            this.chatClient.say(channel, `${(broadcaster.displayName)} has been offline for ${startDate.fromNow(true)}`);
        }

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
