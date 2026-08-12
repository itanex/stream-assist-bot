import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixUser } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockLogger,
} from '../../tests/common.mocks.js';
import { HugCommand } from './hugCommand.js';

describe('Hug Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: HugCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new HugCommand(
            mockChatClient,
            mockApiClient,
            mockLogger,
        );
    });

    describe('should hug a user in chat', () => {
        it.each([
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                [''],
                null,
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TestUser'],
                <HelixUser>{ displayName: 'TestUser', id: 'TestUserId' },
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TargetUser'],
                <HelixUser>{ displayName: 'TargetUser', id: 'TestUserId' },
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TargetUser'],
                null,
            ],
        ])(`user: '%s', commandargs: '%s', target user: '%s'`, async (chatUser: ChatUser, args: string[], apiUser: HelixUser | null) => {
            // Arrange
            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(apiUser);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            if (args[0]) {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledTimes(1);
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledWith(args[0]);
            } else {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledTimes(0);
            }

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(chatUser.displayName));

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
