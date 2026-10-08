import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import ThrowCommand from './throwCommand.js';

describe('Throw Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const responses = {
        throw: {
            '': ['at: %speakinguser% %item% %targetuser%'],
            room: ['room: %speakinguser% %item%'],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new ThrowCommand(
        mockChatClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should throw something in chat', () => {
        it.each([
            [['fish', ''], 'room: TestUser fish'],
            [['fish', 'TargetUser'], 'at: TestUser fish TargetUser'],
        ])(`input: '%s', says: '%s'`, async (args: string[], expected: string) => {
            // Arrange
            const subject = createSubject(responses);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        // Act
        await subject.handle(channel, command, user, message, ['fish', '']);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: 'room' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
