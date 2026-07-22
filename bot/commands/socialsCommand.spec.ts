import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockPhraseService } from '../../tests/common.mocks';
import { SocialsCommand } from './socialsCommand';

const messageFn = (
    command: string,
    subcommand: string,
    body: string = '',
) => `!${command} ${subcommand} ${body}`.trim();

describe('Socials Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{
        displayName: 'TestUser',
    };

    let subject: SocialsCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new SocialsCommand(
            mockChatClient,
            mockPhraseService,
            mockLogger,
        );
    });

    it('should say the variant template', async () => {
        // Arrange
        const subcommand = `Variant`;
        const message = messageFn(subject.phraseFamily, subcommand);
        const response = `Test Response Message`;
        const args: any[] = [
            subcommand,
        ];

        mockPhraseService.getCommandTemplate
            .mockReturnValue(response);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockPhraseService.getCommandTemplate).toHaveBeenCalledWith(subject.phraseFamily, args[0]);
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, response);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });

    it('should say nothing and log a warning', async () => {
        // Arrange
        const warnMessage = 'Unknown Variant';
        const subcommand = `Variant`;
        const message = messageFn(subject.phraseFamily, subcommand);
        const response = ``;
        const args: any[] = [
            subcommand,
        ];

        mockPhraseService.getCommandTemplate
            .mockReturnValue(response);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockPhraseService.getCommandTemplate).toHaveBeenCalledWith(subject.phraseFamily, args[0]);
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(warnMessage, expect.anything());
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
