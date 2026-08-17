import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockCommandResponseRepository } from '../../tests/common.mocks.js';
import { DrinkCommand } from './drinkCommand.js';
import { defaultResponses } from '../utilities/default-responses.js';

describe('Drink Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredText = 'Drink me!';

    let subject: DrinkCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new DrinkCommand(
            mockChatClient,
            mockCommandResponseRepository,
            mockLogger,
        );
    });

    it('says the configured text in chat', async () => {
        // Arrange
        mockCommandResponseRepository
            .getCommandText
            .mockReturnValue(configuredText);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });

    it('says the default text and logs a warning when no text is configured', async () => {
        // Arrange
        mockCommandResponseRepository
            .getCommandText
            .mockReturnValue(undefined);

        // Act
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultResponses.drink);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
