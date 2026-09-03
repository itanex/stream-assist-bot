import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockLogger,
    mockCommandResponseService,
} from '../../tests/common.mocks.js';
import { DivideByZeroCommand } from './DivideByZeroCommand.js';
import { defaultResponses } from '../utilities/default-responses.js';

describe(' Divide By Zero Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredText = 'Absolute Zero';

    let subject: DivideByZeroCommand;

    beforeEach(() => {
        jest.resetAllMocks();
        subject = new DivideByZeroCommand(
            mockChatClient,
            mockCommandResponseService,
            mockLogger,
        );
    });

    it('says the configured text in chat', async () => {
        // Arrange
        mockCommandResponseService
            .getCommandText
            .mockReturnValue(configuredText);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, configuredText);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });

    it('says the default text and logs a warning when no text is configured', async () => {
        // Arrange
        mockCommandResponseService
            .getCommandText
            .mockReturnValue(undefined);

        // Act
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultResponses.dividebyzero['']);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
