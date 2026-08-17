import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseRepository,
    mockLogger,
} from '../../tests/common.mocks.js';
import BrainCommand from './brain.command.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Brain Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    let subject: BrainCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new BrainCommand(
            mockChatClient,
            mockCommandResponseRepository,
            mockLogger,
        );
    });

    describe('should report brain about target', () => {
        it(`that the chatuser is in the response`, async () => {
            // Arrange
            const args: string[] = [];

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.percent}%`);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(user.displayName));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`that the targetuser is in the response`, async () => {
            // Arrange
            const args: string[] = [
                'RandomChannelUser',
            ];

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.percent}%`);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(args[0]));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it(`logs a warning and says nothing in chat, (CommandReponse: undefined)`, async () => {
            // Arrange
            const args: string[] = [];

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(undefined);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(subject.commandName));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
    });
});
