import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { HelpCommand } from './helpCommand.js';

describe('Help Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: HelpCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new HelpCommand(
            mockChatClient,
            mockLogger,
        );
    });

    it('should say something helpful in chat', async () => {
        // Arrange
        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say)
            .toHaveBeenCalledTimes(1);
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect.anything());

        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
