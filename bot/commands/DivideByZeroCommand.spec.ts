import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockPhraseService } from '../../tests/common.mocks';
import { DivideByZeroCommand } from './DivideByZeroCommand';
import { defaultPhrases } from '../utilities/default-phrases';

describe(' Divide By Zero Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredPhrase = 'Absolute Zero';

    let subject: DivideByZeroCommand;

    beforeEach(() => {
        jest.resetAllMocks();
        subject = new DivideByZeroCommand(
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
        subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, configuredPhrase);
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
        expect(mockChatClient.say).toHaveBeenNthCalledWith(1, channel, defaultPhrases.dividebyzero);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
