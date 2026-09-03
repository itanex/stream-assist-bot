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

    let subject: CuddleCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new CuddleCommand(
            mockChatClient,
            mockApiClient,
            mockCommandResponseService,
            mockLogger,
        );
    });

    it('should call chatClient.say with both user name and log', async () => {
        // Arrange
        const args = ['TargetUser'];
        const targetUser = <HelixUser>{ displayName: 'TargetUser' };

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(targetUser);

        mockCommandResponseService
            .getCommandText
            .mockReturnValue(`%${transientKeywords.speakinguser}%, %${transientKeywords.targetuser}%`);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName)
            .toHaveBeenCalledWith(args[0].toLocaleLowerCase().trim());
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(user.displayName));
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(targetUser.displayName));
        expect(mockCommandResponseService.getCommandText).toHaveBeenCalledWith(subject.commandName);
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.anything());
    });
    it('should return and not log anything (no target)', async () => {
        // Arrange
        const args: string[] = [];

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockApiClient.users.getUserByName).not.toHaveBeenCalled();
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockCommandResponseService.getCommandText).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(message));
    });
    it('should return; only log invocation (target user not found)', async () => {
        // Arrange
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
        expect(mockCommandResponseService.getCommandText).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalled();
    });
    it('should return; only log invocation (target user == chat user)', async () => {
        // Arrange
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
        expect(mockChatClient.say).toHaveBeenCalledTimes(0);
        expect(mockCommandResponseService.getCommandText).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalled();
    });
    it(`logs a warning and says nothing in chat, (CommandReponse: undefined)`, async () => {
        // Arrange
        const args: string[] = ['TargetUser'];
        const targetUser = <HelixUser>{ displayName: 'TargetUser' };

        mockApiClient
            .users
            .getUserByName
            .mockResolvedValue(targetUser);

        mockCommandResponseService
            .getCommandText
            .mockReturnValue(undefined);

        // Act
        await subject.handle(channel, command, user, message, args);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockCommandResponseService.getCommandText).toHaveBeenCalledWith(subject.commandName);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(subject.commandName));
        expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
    });
});
