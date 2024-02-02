// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ApiClient, HelixChannel, HelixChannelFollower, HelixUser } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { FollowAgeCommand } from './followAgeCommand';
import Timespan, { getAgeReport } from '../utilities/timeSpan';
import environment from '../../configurations/environment';

describe('Follow Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

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
            .to(FollowAgeCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should say the follow age of the user', () => {
        it.each([
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                [],
                <HelixUser>{ displayName: 'TestUser', id: 'TestUserId', creationDate: new Date(2000, 0, 1) },
                <HelixChannelFollower>{ followDate: new Date(2000, 1, 1) },
            ], [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['', 'UserName'],
                <HelixUser>{ displayName: 'UserName', id: 'TestUserId', creationDate: new Date(2000, 0, 1) },
                <HelixChannelFollower>{ followDate: new Date(2000, 1, 1) },
            ],

        ])(`input: '%s', '%s', '%s'`, async (chatUser: ChatUser, args: string[], apiUser: HelixUser, followUser: HelixChannelFollower) => {
            // Arrange
            mockApiClient = <unknown>{
                users: {
                    getUserByName: jest.fn().mockResolvedValue(apiUser),
                },
                channels: {
                    getChannelFollowers: jest.fn().mockResolvedValue({
                        data: [followUser],
                    }),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${FollowAgeCommand.name}`);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            if (args[1]) {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledWith(args[1]);
            }

            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    environment.twitchBot.broadcaster.id,
                    args[1] ? apiUser.id : chatUser.userId,
                );

            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(apiUser.displayName));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(age));

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
