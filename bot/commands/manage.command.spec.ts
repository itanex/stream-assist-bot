import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import ManageCommand, {
    InsertReplies,
    UnsupportedMessage,
    UpdateReplies,
} from './manage.command';
import { mockChatClient, mockCommandResponseService, mockLogger } from '../../tests/common.mocks';
import { CommandTextInsertResult, CommandTextUpdateResult } from '../utilities/command-response.service';

const messageFn = (subcommand: string, compoundName: string, text: string) => `!command ${subcommand} ${compoundName} ${text}`;

describe('ManageCommand', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const text = 'Test Text...';
    const user = <ChatUser>{
        displayName: 'TestUser',
    };

    let subject: ManageCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new ManageCommand(
            mockChatClient,
            mockCommandResponseService,
            mockLogger,
        );
    });

    it('Unsupported excessive subvariant (3 generations)', async () => {
        // Arrange
        const compoundName = 'Command.Variant.UnsupportedVariantLevel';
        const subCommand = 'invariant';
        const message = messageFn(subCommand, compoundName, text);
        const args: any[] = [
            subCommand,
            compoundName,
            text,
        ];

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, UnsupportedMessage(compoundName));
        expect(mockLogger.warn).toHaveBeenCalledWith(UnsupportedMessage(compoundName));
    });

    describe('Add Command', () => {
        const subCommand = 'add';

        it.each(Object.keys(InsertReplies) as CommandTextInsertResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = messageFn(subCommand, compoundName, text);
                const args: any[] = [
                    subCommand,
                    compoundName,
                    text,
                ];

                mockCommandResponseService
                    .addCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseService.addCommandText)
                    .toHaveBeenCalledWith(name, text, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, InsertReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseService
                .addCommandText
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
    describe('Edit Command', () => {
        const subCommand = 'edit';

        it.each(Object.keys(UpdateReplies) as CommandTextUpdateResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = `!command edit ${compoundName} ${text}`;
                const args: any[] = [
                    'edit',
                    compoundName,
                    text,
                ];

                mockCommandResponseService
                    .setCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseService.setCommandText)
                    .toHaveBeenCalledWith(name, text, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, UpdateReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseService
                .setCommandText
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
});
