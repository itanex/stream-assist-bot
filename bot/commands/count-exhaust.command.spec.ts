import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { HelixPrivilegedUser } from '@twurple/api';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { CountExhaustCommand } from './countExhaustCommand.js';
import Broadcaster from '../utilities/broadcaster.js';

describe('Count Exhaust Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const responses = { countExhaust: { '': ['counting toes: %broadcaster%'] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    const mockBroadcaster = <unknown>{
        getBroadcaster: jest.fn(),
    } as jest.Mocked<Broadcaster>;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new CountExhaustCommand(
        mockChatClient,
        mockBroadcaster,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    beforeEach(() => {
        mockBroadcaster.getBroadcaster
            .mockResolvedValue(<unknown>{
                displayName: 'TestBroadcaster',
            } as HelixPrivilegedUser);
    });

    it('should respond with a message to the channel', async () => {
        // Arrange
        const subject = createSubject(responses);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, 'counting toes: TestBroadcaster');
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.any(String));
    });

    it('should say nothing and log warning when no text is configured', async () => {
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
