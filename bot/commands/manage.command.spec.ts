import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import ManageCommand, {
    DeferredMessage,
    InsertReplies,
    UnsupportedMessage,
} from './manage.command.js';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { CommandTextInsertResult } from '../services/index.js';

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
            mockCommandResponseService,
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
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String));
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
    describe.each(['edit', 'remove', 'restore'])('%s Command (deferred)', subCommand => {
        it('replies that the verb is unavailable and writes nothing', async () => {
            // Arrange
            const compoundName = 'Command.Variant';
            const message = messageFn(subCommand, compoundName, text);
            const args = parseComand(message, subject.exp);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockCommandResponseService.updateCommandText).not.toHaveBeenCalled();
            expect(mockCommandResponseService.removeCommandText).not.toHaveBeenCalled();
            expect(mockCommandResponseService.restoreCommandText).not.toHaveBeenCalled();
            expect(mockChatClient.say).toHaveBeenCalledWith(channel, DeferredMessage(subCommand));
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { compoundName });
        });
    });
});
