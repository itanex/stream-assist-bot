import {
    ApiClient,
    HelixPaginatedResult,
    HelixPaginatedScheduleFilter,
    HelixPaginatedVideoFilter,
    HelixUser,
    HelixVideo,
} from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import calendar from 'dayjs/plugin/calendar.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
// import { HelixPaginatedScheduleResult } from '@twurple/api/lib/interfaces/endpoints/schedule.input';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class ShoutOutCommand implements ICommandHandler {
    exp: RegExp = /^!(so|shoutout) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = false;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'shoutout';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    private async sayResponse(channel: string, variant: string, context: TransientContext): Promise<void> {
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, variant);

        if (commandText) {
            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
        }
    }

    async getLatestSchedule(user: HelixUser, channel: string, link: string) {
        // Get schedule for the user
        const schedule = await this.apiClient.schedule
            .getSchedule(user.id, <HelixPaginatedScheduleFilter>{
                startDate: `${dayjs().subtract(1, 'day').toISOString()}`,
            })
            .catch(x => {
                if (x.statusCode === 404) {
                    this.logger.info(`* API: No schedule for ${user.id}`);
                }
                return x;
            });

        // Is there any schedule items
        if (schedule.cursor != null && schedule.data.segments.length > 0) {
            const nextShow = schedule.data.segments[0];
            const startDate = dayjs(nextShow.startDate);

            const variant = (startDate.isBefore(dayjs(), `seconds`) ? 'wasstreaming' : 'planstostream')
                + (startDate.isToday() ? 'today' : '')
                + (nextShow.categoryName != null ? '' : 'notopic');

            await this.sayResponse(channel, variant, {
                targetuser: user.displayName,
                streamcategory: nextShow.categoryName ?? undefined,
                when: startDate.fromNow(),
                link,
            });
        } else {
            const videos: HelixPaginatedResult<HelixVideo> = await this.apiClient.videos
                .getVideosByUser(user.id, <HelixPaginatedVideoFilter>{ orderBy: `time` })
                .catch(x => {
                    this.logger.info(`* API: Unable to retrieve the video data for ${user.id}`);
                    return x;
                });

            if (videos != null && videos.data.length > 0) {
                const channelDetails = await this.apiClient.channels.getChannelInfoById(user.id);
                const when = dayjs(videos.data[0].creationDate);
                const diff = when.diff(dayjs(), `day`);

                await this.sayResponse(channel, Math.abs(diff) < 10 ? 'lastrecent' : 'last', {
                    targetuser: user.displayName,
                    streamcategory: channelDetails!.gameName,
                    when: when.fromNow(),
                    link,
                });
            } else {
                await this.sayResponse(channel, 'checkout', { targetuser: user.displayName, link });
            }
        }
    }

    async getUserStream(user: HelixUser, channel: string, link: string) {
        const stream = (await user.getStream());

        if (stream && stream.type === 'live') {
            await this.sayResponse(channel, 'justfinished', {
                targetuser: user.displayName,
                streamcategory: stream.gameName,
                link,
            });
        } else {
            await this.sayResponse(channel, 'checkout', { targetuser: user.displayName, link });
        }
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any, resolveChannel?: () => Promise<string>, isRaid: boolean = false): Promise<void> {
        // Get User from the Twitch API
        const user = await this.apiClient.users.getUserByName(args[0]);

        // If no API user is found, exit
        if (!user) {
            return;
        }

        const link = `https://twitch.tv/${user.displayName}`;

        if (isRaid) {
            await this.getUserStream(user, channel, link);
        } else {
            await this.getLatestSchedule(user, channel, link);
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
