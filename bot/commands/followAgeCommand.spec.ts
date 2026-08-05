import 'reflect-metadata';
import { HelixChannelFollower, HelixUser } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks';
import { FollowAgeCommand } from './followAgeCommand';
import Timespan, { getAgeReport } from '../utilities/timeSpan';
import environment from '../../configurations/environment';
import { transientKeywords } from '../utilities/default-responses';

jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            broadcaster: {
                id: 'test-broadcaster-id',
            },
        },
    },
}));

describe('Follow Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const chatUser = <ChatUser>{
        displayName: 'TestUser',
        userId: 'TestUserId',
        isBroadcaster: false,
    };

    let subject: FollowAgeCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new FollowAgeCommand(
            mockChatClient,
            mockApiClient,
            mockCommandResponseService,
            mockLogger,
        );
    });

    describe('should say the follow age of the user', () => {
        it(`say age of speaker's follow age`, async () => {
            // Arrange
            const followUser = <HelixChannelFollower>{
                userDisplayName: chatUser.displayName,
                followDate: new Date(2000, 1, 1),
            };

            mockApiClient
                .channels
                .getChannelFollowers
                .mockResolvedValue({
                    data: [followUser],
                    cursor: 'n/a',
                    total: 1
                });

            mockCommandResponseService
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.followage}%`);

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Assert
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    environment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockCommandResponseService.getCommandText)
                .toHaveBeenCalledWith(subject.commandName);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(chatUser.displayName));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(age));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`say age of targeted user's follow age`, async () => {
            // Arrange
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';
            const followUser = <HelixChannelFollower>{
                userDisplayName: 'TargetUser',
                followDate: new Date(2000, 1, 1)
            };
            const apiUser = <HelixUser>{
                displayName: 'TargetUser',
                id: chatUser.userId,
            };

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(apiUser);

            mockApiClient
                .channels
                .getChannelFollowers
                .mockResolvedValue({
                    data: [followUser],
                    cursor: 'n/a',
                    total: 1
                });

            mockCommandResponseService
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.followage}%`)

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    environment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockCommandResponseService.getCommandText)
                .toHaveBeenCalledWith(subject.commandName);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(followUser.userDisplayName));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(age));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`say nothing, when target user is not following`, async () => {
            // Arrange
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';
            const followUser = <HelixChannelFollower>{
                userDisplayName: chatUser.displayName,
                followDate: new Date(2000, 1, 1)
            };
            const apiUser = <HelixUser>{
                displayName: chatUser.displayName,
                id: chatUser.userId,
            };

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(apiUser);

            mockApiClient
                .channels
                .getChannelFollowers
                .mockResolvedValue({
                    data: [],
                    cursor: 'n/a',
                    total: 1
                });

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    environment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockCommandResponseService.getCommandText)
                .not.toHaveBeenCalled();
            expect(mockChatClient.say)
                .not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`say nothing, when target user is not found`, async () => {
            // Arrange
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';
            const followUser = <HelixChannelFollower>{
                userDisplayName: chatUser.displayName,
                followDate: new Date(2000, 1, 1)
            };

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers)
                .not.toHaveBeenCalled();
            expect(mockCommandResponseService.getCommandText)
                .not.toHaveBeenCalled();
            expect(mockChatClient.say)
                .not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`not say anything, log warning (no CommandText)`, async () => {
            // Arrange
            const followUser = <HelixChannelFollower>{
                userDisplayName: chatUser.displayName,
                followDate: new Date(2000, 1, 1)
            };

            mockApiClient
                .channels
                .getChannelFollowers
                .mockResolvedValue({
                    data: [followUser],
                    cursor: 'n/a',
                    total: 1
                });

            mockCommandResponseService
                .getCommandText
                .mockReturnValue(undefined);

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .not.toHaveBeenCalled();
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    environment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockCommandResponseService.getCommandText).toHaveBeenCalledWith(subject.commandName);
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`say nothing, broadcaster cannot follow self`, async () => {
            // Arrange
            const broadcastUser = <ChatUser>{
                displayName: 'TestBroadcastUser',
                userId: 'TestBroadcastId',
                isBroadcaster: true,
            };

            // Act
            await subject.handle(channel, command, broadcastUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .not.toHaveBeenCalled();
            expect(mockApiClient.channels.getChannelFollowers)
                .not.toHaveBeenCalled();
            expect(mockCommandResponseService.getCommandText)
                .not.toHaveBeenCalled();
            expect(mockChatClient.say)
                .not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
    });
});
