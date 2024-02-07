// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ApiClient, HelixChannel, HelixPaginatedResult, HelixSchedule, HelixStream, HelixUser, HelixVideo } from '@twurple/api';
import { HelixPaginatedScheduleResult } from '@twurple/api/lib/interfaces/endpoints/schedule.input';
import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { ShoutOutCommand } from './shoutOutCommand';

dayjs.extend(relativeTime);

describe('Shout Out Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const args = ['TestShoutOutUser'];
    const apiUser = <HelixUser>{
        displayName: args[0],
        id: 'TestShoutOutUserId',
        getStream: null,
    };
    const apiUserTwitchLink = `https://twitch.tv/${args[0]}`;

    const now = new Date();
    now.setMilliseconds(0);
    now.setSeconds(0);
    now.setMinutes(0);
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

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;
    let mockApiClient: ApiClient;

    beforeEach(() => {
        jest.resetAllMocks();
        container.unbindAll();
        container
            .bind<ChatClient>(ChatClient)
            .toConstantValue(mockChatClient);

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        container
            .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
            .to(ShoutOutCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe(`Shoutout command`, () => {
        it.each([
            [true],
            [false],
        ])(`should not do anything when no user found (isRaid: '%s')`, async (isRaid: boolean) => {
            // Arrange
            mockApiClient = <unknown>{
                users: {
                    getUserByName: jest.fn().mockResolvedValue(null),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            // Act
            await subject.handle(channel, command, user, message, args, isRaid);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledTimes(1);
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[0]);

            expect(expectedChatClient.say).not.toHaveBeenCalled();
            expect(expectedLogger.info).not.toHaveBeenCalled();
        });

        it.each([
            [true],
            [false],
        ])(`should call specific method based on isRaid: '%s'`, async (isRaid: boolean) => {
            // Arrange
            mockApiClient = <unknown>{
                users: {
                    getUserByName: jest.fn().mockResolvedValue(apiUser),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            subject.getUserStream = jest.fn().mockResolvedValue(null);
            subject.getLatestSchedule = jest.fn().mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, user, message, args, isRaid);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledTimes(1);
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[0]);

            if (isRaid) {
                expect(subject.getUserStream).toHaveBeenCalledTimes(1);
                expect(subject.getLatestSchedule).not.toHaveBeenCalled();
                expect(subject.getUserStream)
                    .toHaveBeenCalledWith(apiUser, channel, apiUserTwitchLink);
            } else {
                expect(subject.getUserStream).not.toHaveBeenCalled();
                expect(subject.getLatestSchedule).toHaveBeenCalledTimes(1);
                expect(subject.getLatestSchedule)
                    .toHaveBeenCalledWith(apiUser, channel, apiUserTwitchLink);
            }

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    describe(`Utility Method - getUserStream`, () => {
        it.each([
            [null],
            [{ type: 'live', gameName: 'TestGameName' }],
            [{ type: '', gameName: 'TestGameName' }],
        ])(`should say something in chat about user '%s'`, async (stream: HelixStream) => {
            // Arrange
            apiUser.getStream = jest.fn().mockResolvedValue(stream);

            mockApiClient = {} as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            // Act
            await subject.getUserStream(apiUser, channel, apiUserTwitchLink);

            // Arrange
            expect(apiUser.getStream).toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say).toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`@${apiUser.displayName}`));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUserTwitchLink));

            if (stream && stream.type === 'live') {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(stream.gameName));
            }
        });
    });

    describe(`Utility Method - getLatestSchedule`, () => {
        it(`should log error for 404 response and say generic message in chat`, async () => {
            // Arrange
            mockApiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn().mockRejectedValue({
                        statusCode: 404,
                    }),
                },
                videos: {
                    getVideosByUser: jest.fn().mockRejectedValue(null),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUser.displayName));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUserTwitchLink));

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`* API: No schedule for ${apiUser.id}`));
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect.stringContaining(`* API: Unable to retrieve the video data for ${apiUser.id}`));
        });

        it.each([
            [anHourAgo],
            [anHourFromNow],
        ])(`should process schedule data`, async (startDate: Date) => {
            // Arrange
            const topic = 'TestCategoryName';
            const when = dayjs(startDate).fromNow();
            const schedule: HelixPaginatedScheduleResult = <unknown>{
                cursor: '',
                data: {
                    segments: [{
                        startDate,
                        categoryName: topic,
                    }],
                } as HelixSchedule,
            } as HelixPaginatedScheduleResult;

            mockApiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn().mockResolvedValue(schedule),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUser.displayName));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUserTwitchLink));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(topic));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(when));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining('Today'));
        });

        it.each([
            [anHourAgo, false],
            [twoWeeksAgo, true],
        ])(`should process video data: '%s'`, async (startDate: Date, isOld: boolean) => {
            // Arrange
            const topic = 'TestCategoryName';
            const when = dayjs(startDate).fromNow();
            const schedule: HelixPaginatedScheduleResult = <unknown>{
                cursor: '',
                data: {
                    segments: [],
                } as HelixSchedule,
            } as HelixPaginatedScheduleResult;

            const channelDetails: HelixChannel = <unknown>{
                gameName: topic,
            } as HelixChannel;

            const videos: HelixPaginatedResult<HelixVideo> = <unknown>{
                data: [{
                    creationDate: startDate,
                }],
            } as HelixPaginatedResult<HelixVideo>;

            mockApiClient = <unknown>{
                schedule: {
                    getSchedule: jest.fn().mockResolvedValue(schedule),
                },
                channels: {
                    getChannelInfoById: jest.fn().mockResolvedValue(channelDetails),
                },
                videos: {
                    getVideosByUser: jest.fn().mockResolvedValue(videos),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            // hard type because shoutout upgrades the interface (bad OOP) design
            // to include an additional parameter
            const subject: ShoutOutCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;

            // Act
            await subject.getLatestSchedule(apiUser, channel, apiUserTwitchLink);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUser.displayName));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(apiUserTwitchLink));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(topic));

            if (!isOld) {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(when));
            }
        });
    });
});
