import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import { AboutCommand } from './aboutCommand';
import PhraseService from '../utilities/phrase.service';
import { defaultPhrases } from '../utilities/default-phrases';

describe('About Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const configuredPhrase = 'About Me';
    const mockGetCommand = jest.fn();
    const mockPhraseService = <unknown>{
        getCommandTemplate: mockGetCommand,
    } as PhraseService;

    let subject: AboutCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new AboutCommand(
            mockChatClient,
            mockPhraseService,
            mockLogger,
        );
    });

    it('should say something in chat about bot', async () => {
        // Arrange
        mockGetCommand.mockReturnValue(configuredPhrase);

        // Act
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, configuredPhrase);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });

    it('should create a warn log when the command is not-found (undefined)', async () => {
        // Arrange
        mockGetCommand.mockReturnValue(undefined);

        // Act
        await subject.handle(channel, command, user, message);

        // Assert
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, defaultPhrases.about);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
