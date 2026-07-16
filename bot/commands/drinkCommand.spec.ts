import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockPhraseService } from '../../tests/common.mocks';
import { DrinkCommand } from './drinkCommand';
import { defaultPhrases } from '../utilities/default-phrases';

describe('Drink Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredPhrase = 'Drink me!';

    let subject: DrinkCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new DrinkCommand(
            mockChatClient,
            mockPhraseService,
            mockLogger,
        );
    });

    it('says the configured phrase in chat', async () => {
        // Arrange
        mockPhraseService
            .getCommandTemplate
            .mockReturnValue(configuredPhrase);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });

    it('says the default phrase and logs a warning when no phrase is configured', async () => {
        // Arrange
        mockPhraseService
            .getCommandTemplate
            .mockReturnValue(undefined);

        // Act
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultPhrases.drink);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
