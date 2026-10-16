import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import calendar from 'dayjs/plugin/calendar.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './icommand-handler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { type Environment } from '../../configurations/environment.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';
import { TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

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
    commandName: string = 'lastraid';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Environment) private environment: Environment,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const raidedBroadcasterId = `${this.environment.twitchBot.broadcaster.id}`;

        await this.channelEventRepository
            .getLastRaidEvent(raidedBroadcasterId)
            .then(async record => {
                if (!record) {
                    this.logger.warn(`No incoming raid found for ${this.commandName}`, { raidedBroadcasterId });
                } else {
                    const lastDate = dayjs(record.raidDate).fromNow();

                    const variant = record.viewers > 1 ? '' : 'single';
                    const commandText = this.commandResponseService
                        .getCommandResponse(this.commandName, variant);

                    if (commandText) {
                        const context: TransientContext = {
                            raider: record.raidingBroadcasterDisplayName,
                            when: lastDate,
                            viewercount: `${record.viewers}`,
                        };

                        await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
                    } else {
                        this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
                    }
                }

                this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName}`);
            });
    }
}
