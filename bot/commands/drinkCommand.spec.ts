import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockCommandResponseService } from '../../tests/common.mocks';
import { DrinkCommand } from './drinkCommand';
import { defaultPhrases } from '../utilities/default-phrases';

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
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, expect.anything());
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
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultPhrases.drink);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
