import 'reflect-metadata';
import { jest } from '@jest/globals';
import {
    HelixChannelFollower,
    HelixPrivilegedUser,
    HelixUser,
} from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { FollowAgeCommand } from './followAgeCommand.js';
import Timespan, { getAgeReport } from '../utilities/timeSpan.js';
import { type Environment } from '../../configurations/environment.js';
import { transientKeywords } from '../utilities/default-responses.js';
import Broadcaster from '../utilities/broadcaster.js';

describe('Follow Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const chatUser = <ChatUser>{
        displayName: 'TestUser',
        userId: 'TestUserId',
        isBroadcaster: false,
    };

    const responses = {
        followage: {
            '': [`%${transientKeywords.targetuser}% | %${transientKeywords.broadcaster}% | %${transientKeywords.followage}%`],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    const mockEnvironment = <unknown>{
        twitchBot: {
            broadcaster: {
                id: 'test-broadcaster-id',
            },
        },
    } as Environment;

    const mockBroadcaster = <unknown>{
        getBroadcaster: jest.fn(),
    } as jest.Mocked<Broadcaster>;
    const broadcaster = <unknown>{
        displayName: 'TestBroadcaster',
    } as HelixPrivilegedUser;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new FollowAgeCommand(
        mockChatClient,
        mockApiClient,
        mockBroadcaster,
        createService(entries),
        mockEnvironment,
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    beforeEach(() => {
        mockBroadcaster
            .getBroadcaster
            .mockResolvedValue(broadcaster);
    });

    describe('should say the follow age of the user', () => {
        it(`say age of speaker's follow age`, async () => {
            // Arrange
            const subject = createSubject(responses);
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
                    total: 1,
                });

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Assert
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    mockEnvironment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockBroadcaster.getBroadcaster).toHaveBeenCalled();
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `${chatUser.displayName} | ${broadcaster.displayName} | ${age}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`say age of targeted user's follow age`, async () => {
            // Arrange
            const subject = createSubject(responses);
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';
            const followUser = <HelixChannelFollower>{
                userDisplayName: 'TargetUser',
                followDate: new Date(2000, 1, 1),
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
                    total: 1,
                });

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            const age = getAgeReport(Timespan.fromNow(followUser.followDate));

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    mockEnvironment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockBroadcaster.getBroadcaster).toHaveBeenCalled();
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `${followUser.userDisplayName} | ${broadcaster.displayName} | ${age}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`say nothing, when target user is not following`, async () => {
            // Arrange
            const subject = createSubject(responses);
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';
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
                    total: 1,
                });

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    mockEnvironment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockBroadcaster.getBroadcaster).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`say nothing, when target user is not found`, async () => {
            // Arrange
            const subject = createSubject(responses);
            const args: string[] = ['TargetUser'];
            const expectedApiUsername = 'targetuser';

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(expectedApiUsername);
            expect(mockApiClient.channels.getChannelFollowers).not.toHaveBeenCalled();
            expect(mockBroadcaster.getBroadcaster).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`not say anything, log warning (no text configured)`, async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);
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
                    total: 1,
                });

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName).not.toHaveBeenCalled();
            expect(mockApiClient.channels.getChannelFollowers)
                .toHaveBeenCalledWith(
                    mockEnvironment.twitchBot.broadcaster.id,
                    chatUser.userId,
                );
            expect(mockBroadcaster.getBroadcaster).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`say nothing, broadcaster cannot follow self`, async () => {
            // Arrange
            const subject = createSubject(responses);
            const broadcastUser = <ChatUser>{
                displayName: 'TestBroadcastUser',
                userId: 'TestBroadcastId',
                isBroadcaster: true,
            };

            // Act
            await subject.handle(channel, command, broadcastUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName).not.toHaveBeenCalled();
            expect(mockApiClient.channels.getChannelFollowers).not.toHaveBeenCalled();
            expect(mockBroadcaster.getBroadcaster).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
