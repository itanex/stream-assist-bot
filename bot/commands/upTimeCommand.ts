import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import Broadcaster from '../utilities/broadcaster.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

dayjs.extend(relativeTime);

@injectable()
export class UpTimeCommand implements ICommandHandler {
    exp: RegExp = /!(uptime)/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'uptime';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const broadcaster = await this.broadcaster.getBroadcaster();
        const stream = await broadcaster.getStream();
        const startDate = dayjs(stream!.startDate);

        const variant = stream!.type === 'live' ? '' : 'offline';
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, variant);

        if (commandText) {
            const context: TransientContext = {
                broadcaster: broadcaster.displayName,
                duration: startDate.fromNow(true),
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
