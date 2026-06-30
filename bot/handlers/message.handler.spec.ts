import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import winston from 'winston';
import { MessageHandler } from './message.handler';
import Broadcaster from '../utilities/broadcaster';
import { ICommandHandler } from '../commands';
import StreamStateService from '../utilities/stream-state.service';

const mockSay = jest.fn();
const mockGetBroadcaster = jest.fn();
const mockIsOnline = jest.fn();

const mockChatClient = {
    say: mockSay
} as unknown as ChatClient;

const mockOnlineHandler = jest.fn();
class MockOnlineCommand implements ICommandHandler {
    exp = /!(online)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = mockOnlineHandler;
}

const mockOfflineHandler = jest.fn();
class MockOfflineCommand implements ICommandHandler {
    exp = /!(offline)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'offline' as const;
    handle = mockOfflineHandler;
}

const mockModHandler = jest.fn();
class MockModCommand implements ICommandHandler {
    exp = /!(mod)/i;
    timeout = 0;
    mod = true;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockModHandler;
}

const mockVipHandler = jest.fn();
class MockVipCommand implements ICommandHandler {
    exp = /!(vip)/i;
    timeout = 0;
    mod = false;
    vip = true;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockVipHandler;
}

const mockArtistHandler = jest.fn();
class MockArtistCommand implements ICommandHandler {
    exp = /!(artist)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = true;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockArtistHandler;
}

const mockFounderHandler = jest.fn();
class MockFounderCommand implements ICommandHandler {
    exp = /!(founder)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = true;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockFounderHandler;
}

const mockBroadcasterHandler = jest.fn();
class MockBroadcasterCommand implements ICommandHandler {
    exp = /!(broadcaster)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = mockBroadcasterHandler;
}

const mockSubscriberHandler = jest.fn();
class MockSubscriberCommand implements ICommandHandler {
    exp = /!(subscriber)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = true;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockSubscriberHandler;
}

const mockViewerHandler = jest.fn();
class MockViewerCommand implements ICommandHandler {
    exp = /!(viewer)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = true;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = mockViewerHandler;
}

const mockFollowerHandler = jest.fn();
class MockFollowerCommand implements ICommandHandler {
    exp = /!(follower)/i;
    timeout = 0;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = true;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = mockFollowerHandler;
}

const mockCooldownHandler = jest.fn();
class MockCooldownCommand implements ICommandHandler {
    exp = /!(cooldown)/i;
    timeout = 300;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = true;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = mockCooldownHandler;
}

const mockCooldownCommand = new MockCooldownCommand();
const mockCommandHandlers = [
    new MockOnlineCommand(),
    new MockOfflineCommand(),
    new MockModCommand(),
    new MockVipCommand(),
    new MockArtistCommand(),
    new MockFounderCommand(),
    new MockSubscriberCommand(),
    new MockBroadcasterCommand(),
    new MockViewerCommand(),
    new MockFollowerCommand(),
    mockCooldownCommand,
] as unknown as ICommandHandler[]

const mockBroadcaster = {
    getBroadcaster: mockGetBroadcaster,
    isOnline: mockIsOnline,
} as unknown as Broadcaster;

const mockStreamStateService = {
    isOnline: false
} as unknown as StreamStateService;

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as unknown as winston.Logger;


describe('Message.Handler', () => {
    let messageHandler: MessageHandler;
    const unknownUser = {} as unknown as ChatUser;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockGetBroadcaster.mockResolvedValue({ isFollowedBy: jest.fn().mockResolvedValue(false) });

        messageHandler = new MessageHandler(
            mockChatClient,
            mockCommandHandlers,
            mockBroadcaster,
            mockStreamStateService,
            mockLogger
        );
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    describe('handle', () => {
        it('Skips command execution with no command found', async () => {
            // Arrange - by beforeEach()
            // Act
            await messageHandler.handle('#channel', 'user', '!unknown', unknownUser);

            // Assert
            expect(mockSay).not.toHaveBeenCalled();
        });
        it('skip online command execution when offline', async () => {
            // Arrange
            const command = '!online';
            mockIsOnline.mockResolvedValue(false);

            // Act
            await messageHandler.handle('#channel', 'user', command, unknownUser);

            // Assert
            expect(mockOnlineHandler).not.toHaveBeenCalled();
        });
        it('skip offline command execution when online', async () => {
            // Arrange
            const command = '!offline';
            mockIsOnline.mockResolvedValue(true);

            // Act
            await messageHandler.handle('#channel', 'user', command, unknownUser);

            // Assert
            expect(mockOfflineHandler).not.toHaveBeenCalled();
        });
        describe('IsAuthorized', () => {
            beforeEach(() => {
                mockIsOnline.mockResolvedValue(true);
            });
            it.each`
                role           | command          | userFlags                   | handler
                ${'mod'}       | ${'!mod'}        | ${{ isMod: true }}          | ${mockModHandler}
                ${'vip'}       | ${'!vip'}        | ${{ isVip: true }}          | ${mockVipHandler}
                ${'artist'}    | ${'!artist'}     | ${{ isArtist: true }}       | ${mockArtistHandler}
                ${'founder'}   | ${'!founder'}    | ${{ isFounder: true }}      | ${mockFounderHandler}
                ${'subscriber'}| ${'!subscriber'} | ${{ isSubscriber: true }}   | ${mockSubscriberHandler}
            `('Executes $role command when user has the $role role', async ({ command, userFlags, handler }) => {
                // Arrange
                const user = userFlags as unknown as ChatUser;

                // Act
                await messageHandler.handle('#channel', 'user', command, user);

                // Assert
                expect(handler).toHaveBeenCalled();
            });
            it.each`
                role           | command          | userFlags                   | handler
                ${'mod'}       | ${'!mod'}        | ${{ isMod: false }}          | ${mockModHandler}
                ${'vip'}       | ${'!vip'}        | ${{ isVip: false }}          | ${mockVipHandler}
                ${'artist'}    | ${'!artist'}     | ${{ isArtist: false }}       | ${mockArtistHandler}
                ${'founder'}   | ${'!founder'}    | ${{ isFounder: false }}      | ${mockFounderHandler}
                ${'subscriber'}| ${'!subscriber'} | ${{ isSubscriber: false }}   | ${mockSubscriberHandler}
            `('Skips $role command when user does not have the $role role', async ({ command, userFlags, handler }) => {
                // Arrange
                const user = userFlags as unknown as ChatUser;

                // Act
                await messageHandler.handle('#channel', 'user', command, user);

                // Assert
                expect(handler).not.toHaveBeenCalled();
            });
            it('Execute command when user is Broadcaster', async () => {
                // Arrange
                const broadcasterUser: ChatUser = {
                    isBroadcaster: true,
                } as unknown as ChatUser;
                (mockStreamStateService.isOnline as any) = true
                const command = '!broadcaster';

                // Act
                await messageHandler.handle('#channel', 'user', command, broadcasterUser);

                // Assert
                expect(mockBroadcasterHandler).toHaveBeenCalled();
            });
            it('Skip command execution when user is not the Broadcaster', async () => {
                // Arrange
                const broadcasterUser: ChatUser = {
                    isBroadcaster: false,
                } as unknown as ChatUser;
                const command = '!broadcaster';

                // Act
                await messageHandler.handle('#channel', 'user', command, broadcasterUser);

                // Assert
                expect(mockBroadcasterHandler).not.toHaveBeenCalled();
            });
            it('Executes when command allows viewers', async () => {
                // Arrange
                const command = '!viewer';

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockViewerHandler).toHaveBeenCalled();
            });
            it('Executes when command allows follower', async () => {
                // Arrange
                const command = '!follower';
                mockGetBroadcaster.mockResolvedValue({ isFollowedBy: jest.fn().mockResolvedValue(true) });

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockFollowerHandler).toHaveBeenCalled();
            });
            it('Skips when user has no qualifying role or follower status', async () => {
                // Arrange
                const command = '!follower';

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockFollowerHandler).not.toHaveBeenCalled();
            });
        });
        it('Skips execution when command is on cooldown', async () => {
            // Arrange
            const command = '!cooldown';
            mockIsOnline.mockResolvedValue(true);
            mockGetBroadcaster.mockResolvedValue({ isFollowedBy: jest.fn().mockResolvedValue(true) });

            // Act
            await messageHandler.handle('#channel', 'user', command, unknownUser);
            await messageHandler.handle('#channel', 'user', command, unknownUser);

            // Assert
            expect(mockCooldownHandler).toHaveBeenCalledTimes(1);
        });
        it('Broadcaster does not apply cooldown to commands', async () => {
            // Arrange
            const broadcasterUser: ChatUser = {
                isBroadcaster: true,
            } as unknown as ChatUser;
            const command = '!cooldown';
            mockIsOnline.mockResolvedValue(true);
            mockGetBroadcaster.mockResolvedValue({ isFollowedBy: jest.fn().mockResolvedValue(true) });

            // Act
            await messageHandler.handle('#channel', 'user', command, broadcasterUser);
            await messageHandler.handle('#channel', 'user', command, broadcasterUser);

            // Assert
            expect(mockCooldownHandler).toHaveBeenCalledTimes(2);
        });
        it.each`
            role           | userFlags                   | expectedCooldown
            ${'mod'}       | ${{ isMod: true }}          | ${mockCooldownCommand.timeout / 2}
            ${'vip'}       | ${{ isVip: true }}          | ${mockCooldownCommand.timeout / 2}
            ${'artist'}    | ${{ isArtist: true }}       | ${mockCooldownCommand.timeout / 2}
            ${'founder'}   | ${{ isFounder: true }}      | ${mockCooldownCommand.timeout / 2}
            ${'subscriber'}| ${{ isSubscriber: true }}   | ${mockCooldownCommand.timeout / 2}
            ${'viewer'}    | ${{}}                       | ${mockCooldownCommand.timeout}
        `('User Role ($role) applies $expectedCooldown second cooldown', async ({ userFlags, expectedCooldown }) => {
            // Arrange
            const user = userFlags as unknown as ChatUser;
            const command = '!cooldown';
            mockIsOnline.mockResolvedValue(true);
            mockGetBroadcaster.mockResolvedValue({ isFollowedBy: jest.fn().mockResolvedValue(true) });

            // Act
            await messageHandler.handle('#channel', 'user', command, user);
            jest.advanceTimersByTime(expectedCooldown * 1000);
            await messageHandler.handle('#channel', 'user', command, user);

            // Assert
            expect(mockCooldownHandler).toHaveBeenCalledTimes(2);
        });

    });
});
