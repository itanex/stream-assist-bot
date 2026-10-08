import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import BrainCommand from './brain.command.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Brain Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const responses = { brain: { '': [`brain: %${transientKeywords.targetuser}% %${transientKeywords.percent}%`] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new BrainCommand(
        mockChatClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should report brain about target', () => {
        it.each([
            [[], 'TestUser'],
            [['RandomChannelUser'], 'RandomChannelUser'],
        ])(`args: '%s' reports on '%s'`, async (args: string[], targetuser: string) => {
            // Arrange
            const subject = createSubject(responses);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringMatching(new RegExp(`^brain: ${targetuser} \\d{1,3}$`)));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`logs a warning and says nothing in chat (no text configured)`, async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
