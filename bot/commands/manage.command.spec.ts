import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import ManageCommand, {
    InsertReplies,
    RemoveReplies,
    RestoreReplies,
    UnsupportedMessage,
    UpdateReplies,
} from './manage.command.js';
import { mockChatClient, mockCommandResponseRepository, mockLogger } from '../../tests/common.mocks.js';
import {
    CommandTextInsertResult,
    CommandTextRemoveResult,
    CommandTextUpdateResult,
    CommandTextRestoreResult,
} from '../repositories/command-response.repository.js';

/** Utility method for constructing command message inline with ManageCommand */
const messageFn = (subcommand: string, compoundName: string, text: string = '') => `!command ${subcommand} ${compoundName} ${text}`.trim();

/** Utility method for extracting components to properly invoke the handler */
const parseComand = (message: string, expression: RegExp): string[] => {
    const result = message.trim().match(expression)!;
    if (result) {
        const [, ...[, ...args]] = result;
        return args;
    }
    return [];
};

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
            mockCommandResponseRepository,
            mockLogger,
        );
    });

    it('Unsupported excessive subvariant (3 generations)', async () => {
        // Arrange
        const compoundName = 'Command.Variant.UnsupportedVariantLevel';
        const subCommand = 'add';
        const message = messageFn(subCommand, compoundName, text);
        const args = parseComand(message, subject.exp);

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
                const args = parseComand(message, subject.exp);

                mockCommandResponseRepository
                    .addCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseRepository.addCommandText)
                    .toHaveBeenCalledWith(name, text, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, InsertReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseRepository
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
                const message = messageFn(subCommand, compoundName, text);
                const args = parseComand(message, subject.exp);

                mockCommandResponseRepository
                    .setCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseRepository.setCommandText)
                    .toHaveBeenCalledWith(name, text, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, UpdateReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseRepository
                .setCommandText
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
    describe('Remove Command', () => {
        const subCommand = 'remove';

        it.each(Object.keys(RemoveReplies) as CommandTextRemoveResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = messageFn(subCommand, compoundName);
                const args = parseComand(message, subject.exp);

                mockCommandResponseRepository
                    .removeCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseRepository.removeCommandText)
                    .toHaveBeenCalledWith(name, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, RemoveReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseRepository
                .removeCommandText
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
    describe('Restore Command', () => {
        const subCommand = 'restore';

        it.each(Object.keys(RestoreReplies) as CommandTextRestoreResult[])(
            'replies correctly for %s result',
            async result => {
                // Arrange
                const compoundName = 'Command.Variant';
                const [name, variant] = compoundName.split('.');
                const message = messageFn(subCommand, compoundName);
                const args = parseComand(message, subject.exp);

                mockCommandResponseRepository
                    .restoreCommandText
                    .mockResolvedValue(result);

                // Act
                await subject.handle(channel, command, user, message, args);

                // Assert
                expect(mockCommandResponseRepository.restoreCommandText)
                    .toHaveBeenCalledWith(name, variant);
                expect(mockChatClient.say).toHaveBeenCalledWith(channel, RestoreReplies[result](compoundName));
            },
        );

        it('propagates unexpected service errors without replying', async () => {
            // Arrange
            const message = messageFn(subCommand, command, text);
            const args = [subCommand, command, text];

            mockCommandResponseRepository
                .restoreCommandText
                .mockRejectedValue(new Error('connection lost'));

            // Act & Assert
            await expect(subject.handle(channel, command, user, message, args))
                .rejects.toThrow('connection lost');

            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
    });
});
