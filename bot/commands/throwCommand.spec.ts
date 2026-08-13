import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import ThrowCommand from './throwCommand.js';

describe('Throw Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: ThrowCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new ThrowCommand(
            mockChatClient,
            mockLogger,
        );
    });

    describe('should throw something in chat', () => {
        it.each([
            [['fish', '']],
            [['fish', 'TargetUser']],
        ])(`input: '%s'`, async (args: string[]) => {
            // Arrange
            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(args[0]));

            if (args[1]) {
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(args[1]));
            }

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
