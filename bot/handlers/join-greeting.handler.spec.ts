import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import JoinGreetingHandler, { MOD_GREETING, VIP_GREETING } from './join-greeting.handler';
import StreamStateService from '../utilities/stream-state.service';

const mockSay = jest.fn();
const mockChatClient = {
    say: mockSay,
} as unknown as ChatClient;

const mockOnOffline = jest.fn();
const mockStreamingStateService: StreamStateService = {
    isOnline: false,
    onOffline: mockOnOffline,
} as unknown as StreamStateService;

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
            expect(mockSay).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });
        it('Skips greeting for a viewer (not mod, not vip)`', async () => {
            // Arrange
            (mockStreamingStateService as any).isOnline = true;

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', basicUser);

            // Assert
            expect(mockSay).not.toHaveBeenCalled();
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
            expect(mockSay).toHaveBeenCalledWith('#channel', greeting(user.displayName));
            expect(mockLogger.info).toHaveBeenCalled();
        });
        it('Does not greet the same user twice in a session`', async () => {
            // Arrange
            (mockStreamingStateService as any).isOnline = true;

            // Act
            await joinGreetingHandler.greetIfEligible('#channel', modUser);
            await joinGreetingHandler.greetIfEligible('#channel', modUser);

            // Assert
            expect(mockSay).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalled();
        });
        it('Clears the greeted set when StreamStateService fires the offline callback`', async () => {
            // Arrange - greet the user to populate the set
            (mockStreamingStateService as any).isOnline = true;
            await joinGreetingHandler.greetIfEligible('#channel', modUser);
            expect(mockSay).toHaveBeenCalledTimes(1); // confirm they were greeted

            // Act - fire the offline callback that the constructor registered
            const offlineCallback = mockOnOffline.mock.calls[0][0];
            offlineCallback();

            // Assert - same user is greeted again (set was cleared)
            jest.resetAllMocks(); // reset say count
            await joinGreetingHandler.greetIfEligible('#channel', modUser);
            expect(mockSay).toHaveBeenCalledTimes(1);
        });
    });
});
