import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import ManageCommand, { InsertReplies, UnsupportedMessage, UpdateReplies } from './manage.command';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import PhraseService, { PhraseInsertResult, PhraseUpdateResult } from '../utilities/phrase.service';

const messageFn = (subcommand: string, compoundName: string, template: string) => `!command ${subcommand} ${compoundName} ${template}`;

describe('ManageCommand', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const template = 'TestTemplate';
    const user = <ChatUser>{
        displayName: 'TestUser',
    };

    const mockPhraseService = <unknown>{
        addCommandTemplate: jest.fn(),
        setCommandTemplate: jest.fn(),
    } as jest.Mocked<PhraseService>;

    let subject: ManageCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new ManageCommand(
            mockChatClient,
            mockPhraseService,
            mockLogger,
        );
    });

    it('Unsupported excessive subvariant (3 generations)', async () => {
        // Arrange
        const compoundName = 'Command.Variant.UnsupportedVariantLevel';
        const subCommand = 'invariant';
        const message = messageFn(subCommand, compoundName, template);
        const args: any[] = [
            subCommand,
            compoundName,
            template,
        ];

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, UnsupportedMessage(compoundName));
        expect(mockLogger.warn).toHaveBeenCalledWith(UnsupportedMessage(compoundName));
    });

    describe('Add Command', () => {
        const subCommand = 'add';

        it.each(Object.keys(InsertReplies) as PhraseInsertResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = messageFn(subCommand, compoundName, template);
                const args: any[] = [
                    subCommand,
                    compoundName,
                    template,
                ];

                mockPhraseService.addCommandTemplate
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockPhraseService.addCommandTemplate)
                    .toHaveBeenCalledWith(name, template, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, InsertReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, template);
            const args = [subCommand, command, template];

            mockPhraseService.addCommandTemplate
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
    describe('Edit Command', () => {
        const subCommand = 'edit';

        it.each(Object.keys(UpdateReplies) as PhraseUpdateResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = `!command edit ${compoundName} ${template}`;
                const args: any[] = [
                    'edit',
                    compoundName,
                    template,
                ];

                mockPhraseService.setCommandTemplate
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockPhraseService.setCommandTemplate)
                    .toHaveBeenCalledWith(name, template, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, UpdateReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, template);
            const args = [subCommand, command, template];

            mockPhraseService.setCommandTemplate
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
});
