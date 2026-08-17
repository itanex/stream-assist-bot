import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockCommandResponseRepository } from '../../tests/common.mocks.js';
import { AboutCommand } from './aboutCommand.js';
import { defaultResponses } from '../utilities/default-responses.js';

describe('About Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredText = 'About Me';

    let subject: AboutCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new AboutCommand(
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
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, configuredText);
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
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultResponses.about);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
