import { ApiClient, HelixPaginatedResult, HelixPaginatedScheduleFilter, HelixPaginatedVideoFilter, HelixUser, HelixVideo } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { HelixPaginatedScheduleResult } from '@twurple/api/lib/interfaces/endpoints/schedule.input';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class ShoutOutCommand implements ICommandHandler {
    exp: RegExp = /^!(so|shoutout) [#@]?([a-zA-Z0-9][\w]{2,24})$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = false;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async getLatestSchedule(user: HelixUser, channel: string, link: string) {
        // Get schedule for the user
        const schedule: HelixPaginatedScheduleResult = await this.apiClient.schedule
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

            const entry = startDate.isToday() ? `Today, ` : '';
            const topic = nextShow.categoryName != null ? `'${nextShow.categoryName}'` : '';
            const when = `${startDate.fromNow()}`;

            if (startDate.isBefore(dayjs(), `seconds`)) {
                this.chatClient.say(channel, `${entry} @${user.displayName} was streaming ${topic} ${when} - ${link}`);
            } else {
                this.chatClient.say(channel, `${entry} @${user.displayName} plans to stream ${topic} ${when} - ${link}`);
            }
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

                if (Math.abs(diff) < 10) {
                    this.chatClient.say(channel, `@${user.displayName} was last streaming '${channelDetails.gameName}' ${when.fromNow()} - ${link}`);
                } else {
                    this.chatClient.say(channel, `@${user.displayName} was last streaming '${channelDetails.gameName}' - ${link}`);
                }
            } else {
                this.chatClient.say(channel, `Check out @${user.displayName} at ${link}`);
            }
        }
    }

    async getUserStream(user: HelixUser, channel: string, link: string) {
        const stream = (await user.getStream());

        if (stream && stream.type === 'live') {
            this.chatClient.say(channel, `@${user.displayName} just finished streaming '${stream.gameName}' - ${link}`);
        } else {
            this.chatClient.say(channel, `Check out @${user.displayName} at ${link}`);
        }
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any, isRaid: boolean = false): Promise<void> {
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

        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
