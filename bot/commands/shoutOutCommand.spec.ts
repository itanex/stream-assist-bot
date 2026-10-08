import 'reflect-metadata';
import { jest } from '@jest/globals';
import {
    ApiClient,
    HelixChannel,
    HelixChannelApi,
    HelixPaginatedResult,
    HelixSchedule,
    HelixScheduleApi,
    HelixStream,
    HelixUser,
    HelixUserApi,
    HelixVideo,
    HelixVideoApi,
} from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { ShoutOutCommand } from './shoutOutCommand.js';

dayjs.extend(relativeTime);

describe('Shout Out Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const args = ['TestShoutOutUser'];
    const apiUser = <unknown>{
        displayName: args[0],
        id: 'TestShoutOutUserId',
        getStream: null,
    } as HelixUser;
    const apiUserTwitchLink = `https://twitch.tv/${args[0]}`;

    const topicVariants = ['wasstreaming', 'wasstreamingtoday', 'planstostream', 'planstostreamtoday'];
    const responses = {
        shoutout: {
            ...Object.fromEntries(topicVariants
                .map(variant => [variant, [`${variant}: @%targetuser% '%streamcategory%' %when% - %link%`]])),
            ...Object.fromEntries(topicVariants
                .map(variant => [`${variant}notopic`, [`${variant}notopic: @%targetuser% %when% - %link%`]])),
            lastrecent: [`lastrecent: @%targetuser% '%streamcategory%' %when% - %link%`],
            last: [`last: @%targetuser% '%streamcategory%' - %link%`],
            checkout: ['checkout: @%targetuser% %link%'],
            justfinished: [`justfinished: @%targetuser% '%streamcategory%' - %link%`],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    // Anchored to noon (not the actual current hour) so an hour offset in either
    // direction can never cross a day boundary and make isToday() flaky.
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const anHourAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() - 1,
        0,
        0,
        0,
    );
    const anHourFromNow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() + 1,
        0,
        0,
        0,
    );
    const twoWeeksAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 14,
        now.getHours(),
        0,
        0,
        0,
    );

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (
        apiClient: ApiClient,
        entries: Record<string, Record<string, string[]>> = responses,
    ) => new ShoutOutCommand(
        mockChatClient,
        apiClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe(`Shoutout command`, () => {
        it.each([
            [true],
            [false],
        ])(`should not do anything when no user found (isRaid: '%s')`, async (isRaid: boolean) => {
            // Arrange
            const apiClient = <unknown>{
                users: {
                    getUserByName: jest.fn<HelixUserApi['getUserByName']>().mockResolvedValue(null),
                },
            } as ApiClient;
            const subject = createSubject(apiClient);

            // Act
            await subject.handle(channel, command, user, message, args, undefined, isRaid);

            // Assert
            expect(apiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[0]);
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        it.each([
            [true],
            [false],
        ])(`should call specific method based on isRaid: '%s'`, async (isRaid: boolean) => {
            // Arrange
            const apiClient = <unknown>{
                users: {
                    getUserByName: jest.fn<HelixUserApi['getUserByName']>().mockResolvedValue(apiUser),
                },
            } as ApiClient;
            const subject = createSubject(apiClient);

            subject.getUserStream = jest.fn<ShoutOutCommand['getUserStream']>().mockResolvedValue(undefined);
            subject.getLatestSchedule = jest.fn<ShoutOutCommand['getLatestSchedule']>().mockResolvedValue(undefined);

            // Act
            await subject.handle(channel, command, user, message, args, undefined, isRaid);

            // Assert
            expect(apiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[0]);

            if (isRaid) {
                expect(subject.getUserStream)
                    .toHaveBeenCalledWith(apiUser, channel, apiUserTwitchLink);
                expect(subject.getLatestSchedule).not.toHaveBeenCalled();
            } else {
                expect(subject.getUserStream).not.toHaveBeenCalled();
                expect(subject.getLatestSchedule)
                    .toHaveBeenCalledWith(apiUser, channel, apiUserTwitchLink);
            }

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe(`Utility Method - getUserStream`, () => {
        it.each([
            [null, `checkout: @${args[0]} ${apiUserTwitchLink}`],
            [<HelixStream>{ type: 'live', gameName: 'TestGameName' }, `justfinished: @${args[0]} 'TestGameName' - ${apiUserTwitchLink}`],
            [<HelixStream>{ type: '', gameName: 'TestGameName' }, `checkout: @${args[0]} ${apiUserTwitchLink}`],
        ])(`should say something in chat about user '%s'`, async (stream: HelixStream | null, expected: string) => {
            // Arrange
            const subject = createSubject({} as ApiClient);
            apiUser.getStream = jest.fn<HelixUser['getStream']>().mockResolvedValue(stream);

            // Act
            await subject.getUserStream(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(apiUser.getStream).toHaveBeenCalledTimes(1);
            expect(mockChatClient.say).toHaveBeenCalledTimes(1);
            expect(mockChatClient.say).toHaveBeenCalledWith(channel, expected);
        });
    });

    describe(`Utility Method - getLatestSchedule`, () => {
        it(`should log 404 response and say generic message in chat`, async () => {
            // Arrange
            const apiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn<HelixScheduleApi['getSchedule']>().mockRejectedValue({
                        statusCode: 404,
                    }),
                },
                videos: {
                    getVideosByUser: jest.fn<HelixVideoApi['getVideosByUser']>().mockRejectedValue(null),
                },
            } as ApiClient;
            const subject = createSubject(apiClient);

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `checkout: @${args[0]} ${apiUserTwitchLink}`);
            expect(mockLogger.info)
                .toHaveBeenCalledTimes(2);
            expect(mockLogger.info)
                .toHaveBeenNthCalledWith(1, expect.any(String));
            expect(mockLogger.info)
                .toHaveBeenNthCalledWith(2, expect.any(String));
        });

        it.each([
            [anHourAgo, 'TestCategoryName', 'wasstreamingtoday'],
            [anHourFromNow, 'TestCategoryName', 'planstostreamtoday'],
            [anHourAgo, null, 'wasstreamingtodaynotopic'],
            [anHourFromNow, null, 'planstostreamtodaynotopic'],
        ])(`should process schedule data: '%s', topic: '%s', variant: '%s'`, async (startDate: Date, topic: string | null, variant: string) => {
            // Arrange
            const when = dayjs(startDate).fromNow();
            const schedule: Awaited<ReturnType<HelixScheduleApi['getSchedule']>> = {
                cursor: '',
                data: <unknown>{
                    segments: [{
                        startDate,
                        categoryName: topic,
                    }],
                } as HelixSchedule,
            };

            const apiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn<HelixScheduleApi['getSchedule']>().mockResolvedValue(schedule),
                },
            } as ApiClient;
            const subject = createSubject(apiClient);

            const expected = topic
                ? `${variant}: @${args[0]} '${topic}' ${when} - ${apiUserTwitchLink}`
                : `${variant}: @${args[0]} ${when} - ${apiUserTwitchLink}`;

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
        });

        it.each([
            [anHourAgo, 'lastrecent'],
            [twoWeeksAgo, 'last'],
        ])(`should process video data: '%s', variant: '%s'`, async (startDate: Date, variant: string) => {
            // Arrange
            const topic = 'TestCategoryName';
            const when = dayjs(startDate).fromNow();
            const schedule: Awaited<ReturnType<HelixScheduleApi['getSchedule']>> = {
                cursor: '',
                data: <unknown>{
                    segments: [],
                } as HelixSchedule,
            };

            const channelDetails: HelixChannel = <unknown>{
                gameName: topic,
            } as HelixChannel;

            const videos: HelixPaginatedResult<HelixVideo> = <unknown>{
                data: [{
                    creationDate: startDate,
                }],
            } as HelixPaginatedResult<HelixVideo>;

            const apiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn<HelixScheduleApi['getSchedule']>().mockResolvedValue(schedule),
                },
                channels: {
                    getChannelInfoById: jest.fn<HelixChannelApi['getChannelInfoById']>().mockResolvedValue(channelDetails),
                },
                videos: {
                    getVideosByUser: jest.fn<HelixVideoApi['getVideosByUser']>().mockResolvedValue(videos),
                },
            } as ApiClient;
            const subject = createSubject(apiClient);

            const expected = variant === 'lastrecent'
                ? `lastrecent: @${args[0]} '${topic}' ${when} - ${apiUserTwitchLink}`
                : `last: @${args[0]} '${topic}' - ${apiUserTwitchLink}`;

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
        });

        it(`should say nothing and log warning when no text is configured`, async () => {
            // Arrange
            const apiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn<HelixScheduleApi['getSchedule']>().mockRejectedValue({
                        statusCode: 404,
                    }),
                },
                videos: {
                    getVideosByUser: jest.fn<HelixVideoApi['getVideosByUser']>().mockRejectedValue(null),
                },
            } as ApiClient;
            const subject = createSubject(apiClient, unrelatedResponses);

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn)
                .toHaveBeenCalledWith(expect.any(String), { variant: 'checkout' });
        });
    });
});
