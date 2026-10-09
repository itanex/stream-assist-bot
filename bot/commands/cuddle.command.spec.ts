import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixUser } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { CuddleCommand } from './cuddle.command.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Cuddle Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{ displayName: 'TestUser' };
    const message = 'TestMessage';

    const responses = { cuddle: { '': [`cuddle: %${transientKeywords.speakinguser}% %${transientKeywords.targetuser}%`] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new CuddleCommand(
        mockChatClient,
        mockApiClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should call chatClient.say with both user names and log', async () => {
        // Arrange
        const subject = createSubject(responses);
        const args = ['TargetUser'];
        const targetUser = <HelixUser>{ displayName: 'TargetUser' };

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(targetUser);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName)
            .toHaveBeenCalledWith(args[0].toLocaleLowerCase().trim());
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, `cuddle: ${user.displayName} ${targetUser.displayName}`);
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.any(String));
    });

    it('should only log invocation (no target)', async () => {
        // Arrange
        const subject = createSubject(responses);
        const args: string[] = [];

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName).not.toHaveBeenCalled();
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });

    it('should only log invocation (target user not found)', async () => {
        // Arrange
        const subject = createSubject(responses);
        const args = ['TargetUser'];

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(null);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName)
            .toHaveBeenCalledWith(args[0]?.toLocaleLowerCase().trim());
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });

    it('should only log invocation (target user == chat user)', async () => {
        // Arrange
        const subject = createSubject(responses);
        const args = [user.displayName];

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(<HelixUser>{ displayName: user.displayName });

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName)
            .toHaveBeenCalledWith(args[0]?.toLocaleLowerCase().trim());
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });

    it(`logs a warning and says nothing in chat (no text configured)`, async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);
        const args: string[] = ['TargetUser'];

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(<HelixUser>{ displayName: 'TargetUser' });

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
