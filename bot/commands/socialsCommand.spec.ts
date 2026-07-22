import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger, mockPhraseService } from '../../tests/common.mocks';
import { SocialsCommand } from './socialsCommand';
import PhraseService from '../utilities/phrase.service';

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

    describe('cooldownKey()', () => {
        it(`should present 'commandName' as the key (standard interpretation)`, () => {
            // Arrange
            const args: any[] = [undefined];

            // Act
            const result = subject.cooldownKey(args);

            // Assert
            expect(mockPhraseService.getCommandTemplate).toHaveBeenCalledWith(subject.phraseFamily, args[0]);
            expect(result).toBe(SocialsCommand.name);
        });
        it(`should present 'commandName' as the key (Unknown Variant)`, () => {
            // Arrange
            const args: any[] = ['UnknownVariant'];

            // Act
            const result = subject.cooldownKey(args);

            // Assert
            expect(mockPhraseService.getCommandTemplate).toHaveBeenCalledWith(subject.phraseFamily, args[0]);
            expect(result).toBe(SocialsCommand.name);
        });
        it('should present `commandName.variant` as the key (Known Variant)', () => {
            // Arrange
            const args = ['variant'];
            mockPhraseService.getCommandTemplate
                .mockReturnValue('valid template');

            // Act
            const result = subject.cooldownKey(args);

            // Assert
            expect(mockPhraseService.getCommandTemplate).toHaveBeenCalledWith(subject.phraseFamily, args[0]);
            expect(result).toBe(`${SocialsCommand.name}:${args[0]}`);
        });
    });
    describe('handle()', () => {
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
});
