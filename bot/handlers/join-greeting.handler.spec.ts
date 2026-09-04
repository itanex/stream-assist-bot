import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import JoinGreetingHandler, { MOD_GREETING, VIP_GREETING } from './join-greeting.handler.js';
import { GreetUserService, StreamStateService } from '../services/index.js';

const mockChatClient = <unknown>{
    say: jest.fn<ChatClient['say']>(),
} as jest.Mocked<ChatClient>;

const mockStreamingStateService = <unknown>{
    isOnline: false,
    onOffline: jest.fn<StreamStateService['onOffline']>(),
} as jest.Mocked<StreamStateService>;

const mockGreetUserService = <unknown>{
    clear: jest.fn<GreetUserService['clear']>(),
    hasUser: jest.fn<GreetUserService['hasUser']>(),
    saveUser: jest.fn<GreetUserService['saveUser']>(),
} as jest.Mocked<GreetUserService>;

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as winston.Logger;

describe('JoinGreetingHandler', () => {
    let joinGreetingHandler: JoinGreetingHandler;
    const basicUser = {
        userId: 1234,
        isMod: false,
        isVip: false,
    } as unknown as ChatUser;
    const modVipUser = {
        userId: 1235,
        displayName: 'modVip',
        isMod: true,
        isVip: true,
    } as unknown as ChatUser;
    const modUser = {
        userId: 1236,
        displayName: 'mod',
        isMod: true,
    } as unknown as ChatUser;
    const vipUser = {
        userId: 1237,
        displayName: 'vip',
        isVip: true,
    } as unknown as ChatUser;

    beforeEach(() => {
        jest.resetAllMocks();

        joinGreetingHandler = new JoinGreetingHandler(
            mockChatClient,
            mockStreamingStateService,
            mockGreetUserService,
            mockLogger,
        );
    });

    describe('greetIfEligible', () => {
        it('Skips greeting when stream is `offline`', async () => {
            // Arrange
            (mockStreamingStateService as any).isOnline = false;

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', basicUser);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });
        it('Skips greeting for a viewer (not mod, not vip)`', async () => {
            // Arrange
            (mockStreamingStateService as any).isOnline = true;

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', basicUser);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });
        it.each`
            role         | user          | greeting
            ${'mod'}     | ${modUser}    | ${MOD_GREETING}
            ${'vip'}     | ${vipUser}    | ${VIP_GREETING}
            ${'mod/vip'} | ${modVipUser} | ${MOD_GREETING}
        `('Greets a $role - sends the correct $role greeting message`', async ({ role, user, greeting }) => {
            // Arrange
            (mockStreamingStateService as any).isOnline = true;

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', user);

            // Assert
            expect(mockChatClient.say).toHaveBeenCalledWith('#channel', greeting(user.displayName));
            expect(mockLogger.info).toHaveBeenCalled();
        });
        it('Does not greet the same user twice in a session`', async () => {
            // Arrange
            (mockStreamingStateService as any).isOnline = true;

            mockGreetUserService
                .hasUser
                .mockReturnValueOnce(false)
                .mockReturnValue(true);

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', modUser);
            await joinGreetingHandler.greetIfEligible('#channel', modUser);

            // Assert
            expect(mockChatClient.say).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalled();
        });
        it('Clears the greeted set when StreamStateService fires the offline callback`', async () => {
            // Arrange
            const offlineCallback = mockStreamingStateService
                .onOffline
                .mock
                .calls[0][0];

            // Act
            offlineCallback();

            // Assert
            expect(mockStreamingStateService.onOffline)
                .toHaveBeenCalled();
            expect(mockGreetUserService.clear)
                .toHaveBeenCalled();
        });
    });
});
