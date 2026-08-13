import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { FallCommand } from './fallCommand.js';

describe('Fall Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: FallCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new FallCommand(
            mockChatClient,
            mockLogger,
        );
    });

    it('should say something about falling in chat', async () => {
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
