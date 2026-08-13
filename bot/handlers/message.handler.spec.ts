import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatClient, ChatUser } from '@twurple/chat';
import { HelixPrivilegedUser } from '@twurple/api';
import { MessageHandler } from './message.handler.js';
import Broadcaster from '../utilities/broadcaster.js';
import { ICommandHandler } from '../commands/index.js';
import StreamStateService from '../utilities/stream-state.service.js';
import { mockApiClient, mockLogger } from '../../tests/common.mocks.js';

const mockChatClient = <unknown>{
    say: jest.fn(),
} as jest.Mocked<ChatClient>;

const mockOnlineHandler = jest.fn<ICommandHandler['handle']>();
class MockOnlineCommand implements ICommandHandler {
    exp = /!(online)/i;
    timeout = 0;
    leadMod = false;
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

const mockOfflineHandler = jest.fn<ICommandHandler['handle']>();
class MockOfflineCommand implements ICommandHandler {
    exp = /!(offline)/i;
    timeout = 0;
    leadMod = false;
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

const mockLeadModHandler = jest.fn<ICommandHandler['handle']>();
class MockLeadModCommand implements ICommandHandler {
    exp = /!(leadmod)/i;
    timeout = 0;
    leadMod = true;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = false;
    isGlobalCommand = false;
    restriction = 'always' as const;
    handle = mockLeadModHandler;
}

const mockModHandler = jest.fn<ICommandHandler['handle']>();
class MockModCommand implements ICommandHandler {
    exp = /!(mod)/i;
    timeout = 0;
    leadMod = false;
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

const mockVipHandler = jest.fn<ICommandHandler['handle']>();
class MockVipCommand implements ICommandHandler {
    exp = /!(vip)/i;
    timeout = 0;
    leadMod = false;
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

const mockArtistHandler = jest.fn<ICommandHandler['handle']>();
class MockArtistCommand implements ICommandHandler {
    exp = /!(artist)/i;
    timeout = 0;
    leadMod = false;
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

const mockFounderHandler = jest.fn<ICommandHandler['handle']>();
class MockFounderCommand implements ICommandHandler {
    exp = /!(founder)/i;
    timeout = 0;
    leadMod = false;
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

const mockBroadcasterHandler = jest.fn<ICommandHandler['handle']>();
class MockBroadcasterCommand implements ICommandHandler {
    exp = /!(broadcaster)/i;
    timeout = 0;
    leadMod = false;
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

const mockSubscriberHandler = jest.fn<ICommandHandler['handle']>();
class MockSubscriberCommand implements ICommandHandler {
    exp = /!(subscriber)/i;
    timeout = 0;
    leadMod = false;
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

const mockViewerHandler = jest.fn<ICommandHandler['handle']>();
class MockViewerCommand implements ICommandHandler {
    exp = /!(viewer)/i;
    timeout = 0;
    leadMod = false;
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

const mockFollowerHandler = jest.fn<ICommandHandler['handle']>();
class MockFollowerCommand implements ICommandHandler {
    exp = /!(follower)/i;
    timeout = 0;
    leadMod = false;
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

class MockCooldownCommand implements ICommandHandler {
    exp = /!(cooldown)/i;
    timeout = 300;
    leadMod = false;
    mod = false;
    vip = false;
    artist = false;
    founder = false;
    subscriber = false;
    follower = false;
    viewer = true;
    isGlobalCommand = false;
    restriction = 'online' as const;
    handle = jest.fn<ICommandHandler['handle']>();
    cooldownKey = jest.fn<NonNullable<ICommandHandler['cooldownKey']>>();
}

const mockCooldownCommand = new MockCooldownCommand();
const mockCommandHandlers = [
    new MockOnlineCommand(),
    new MockOfflineCommand(),
    new MockLeadModCommand(),
    new MockModCommand(),
    new MockVipCommand(),
    new MockArtistCommand(),
    new MockFounderCommand(),
    new MockSubscriberCommand(),
    new MockBroadcasterCommand(),
    new MockViewerCommand(),
    new MockFollowerCommand(),
    mockCooldownCommand,
] as unknown as ICommandHandler[];

const mockBroadcaster = <unknown>{
    getBroadcaster: jest.fn(),
    isOnline: jest.fn(),
} as jest.Mocked<Broadcaster>;

const mockIsOnline = jest.fn<() => boolean>();
const mockStreamStateService = <unknown>{} as jest.Mocked<StreamStateService>;
Object.defineProperty(mockStreamStateService, 'isOnline', { get: mockIsOnline });

describe('Message.Handler', () => {
    let messageHandler: MessageHandler;
    const unknownUser = {} as unknown as ChatUser;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.useFakeTimers();

        mockBroadcaster.getBroadcaster
            .mockResolvedValue(<unknown>{
                isFollowedBy: jest.fn<HelixPrivilegedUser['isFollowedBy']>().mockResolvedValue(false),
            } as HelixPrivilegedUser);

        messageHandler = new MessageHandler(
            mockChatClient,
            mockApiClient,
            mockCommandHandlers,
            mockBroadcaster,
            mockStreamStateService,
            mockLogger,
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
            expect(mockChatClient.say).not.toHaveBeenCalled();
        });
        it('skip online command execution when offline', async () => {
            // Arrange
            const command = '!online';

            mockIsOnline.mockReturnValue(false);

            // Act
            await messageHandler.handle('#channel', 'user', command, unknownUser);

            // Assert
            expect(mockOnlineHandler).not.toHaveBeenCalled();
        });
        it('skip offline command execution when online', async () => {
            // Arrange
            const command = '!offline';

            mockIsOnline.mockReturnValue(true);

            // Act
            await messageHandler.handle('#channel', 'user', command, unknownUser);

            // Assert
            expect(mockOfflineHandler).not.toHaveBeenCalled();
        });
        describe('IsAuthorized', () => {
            beforeEach(() => {
                mockIsOnline.mockReturnValue(true);
            });

            it.each`
                role           | command          | userFlags                   | handler
                ${'leadmod'}   | ${'!leadmod'}    | ${{ isLeadMod: true }}      | ${mockLeadModHandler}
                ${'leadmod'}   | ${'!mod'}        | ${{ isLeadMod: true }}      | ${mockModHandler}
                ${'mod'}       | ${'!mod'}        | ${{ isMod: true }}          | ${mockModHandler}
                ${'vip'}       | ${'!vip'}        | ${{ isVip: true }}          | ${mockVipHandler}
                ${'artist'}    | ${'!artist'}     | ${{ isArtist: true }}       | ${mockArtistHandler}
                ${'founder'}   | ${'!founder'}    | ${{ isFounder: true }}      | ${mockFounderHandler}
                ${'subscriber'}| ${'!subscriber'} | ${{ isSubscriber: true }}   | ${mockSubscriberHandler}
            `('Executes $command command when user has the $role role', async ({ command, userFlags, handler }) => {
                // Arrange
                const user = userFlags as unknown as ChatUser;

                handler.mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, user);

                // Assert
                expect(handler).toHaveBeenCalled();
            });
            it.each`
                role           | command          | userFlags                    | handler
                ${'leadmod'}   | ${'!leadmod'}    | ${{ isLeadMod: false }}      | ${mockLeadModHandler}
                ${'leadmod'}   | ${'!mod'}        | ${{ isLeadMod: false }}      | ${mockModHandler}
                ${'mod'}       | ${'!leadmod'}    | ${{ isMod: false }}          | ${mockLeadModHandler}
                ${'mod'}       | ${'!mod'}        | ${{ isMod: false }}          | ${mockModHandler}
                ${'vip'}       | ${'!vip'}        | ${{ isVip: false }}          | ${mockVipHandler}
                ${'artist'}    | ${'!artist'}     | ${{ isArtist: false }}       | ${mockArtistHandler}
                ${'founder'}   | ${'!founder'}    | ${{ isFounder: false }}      | ${mockFounderHandler}
                ${'subscriber'}| ${'!subscriber'} | ${{ isSubscriber: false }}   | ${mockSubscriberHandler}
            `('Skips $command command when user does not have the $role role', async ({ command, userFlags, handler }) => {
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
                const command = '!broadcaster';

                mockBroadcasterHandler.mockResolvedValue(undefined);

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

                mockViewerHandler.mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockViewerHandler).toHaveBeenCalled();
            });
            it('Executes when command allows follower', async () => {
                // Arrange
                const command = '!follower';
                mockBroadcaster.getBroadcaster
                    .mockResolvedValue(<unknown>{
                        isFollowedBy: jest.fn<HelixPrivilegedUser['isFollowedBy']>().mockResolvedValue(true),
                    } as HelixPrivilegedUser);

                mockFollowerHandler.mockResolvedValue(undefined);

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
            it('command handler logs errors thrown', async () => {
                // Arrange
                const command = '!viewer';
                const errorMessage = 'Error message';

                mockViewerHandler.mockRejectedValue(errorMessage);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockViewerHandler).toHaveBeenCalled();
                expect(mockLogger.error)
                    .toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            channel: '#channel',
                            user: 'user',
                            chatUser: unknownUser,
                            reason: errorMessage,
                        }),
                    );
            });
        });
        describe('Handle Command Cooldown', () => {
            const command = '!cooldown';

            beforeEach(() => {
                mockIsOnline.mockReturnValue(true);
            });

            it('Uses cooldownKey to bucket cooldown when implemented', async () => {
                // Arrange
                const cooldownKey = 'TestBucketKey';

                mockCooldownCommand.cooldownKey
                    .mockReturnValue(cooldownKey);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockCooldownCommand.cooldownKey)
                    .toHaveBeenCalledWith([]);

                expect((messageHandler as any).globalTimeouts)
                    .toContainEqual(expect.objectContaining({ name: cooldownKey }));
            });
            it('Does not apply cooldown across different cooldownKey buckets', async () => {
                // Arrange
                const cooldownKey = 'TestBucketKey';

                mockCooldownCommand.cooldownKey
                    .mockReturnValueOnce(`${cooldownKey}-1`)
                    .mockReturnValueOnce(`${cooldownKey}-2`);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockCooldownCommand.handle).toHaveBeenCalledTimes(2);

                expect((messageHandler as any).globalTimeouts)
                    .toContainEqual(expect.objectContaining({ name: `${cooldownKey}-1` }));
                expect((messageHandler as any).globalTimeouts)
                    .toContainEqual(expect.objectContaining({ name: `${cooldownKey}-2` }));
            });
            it('Displays instruction, not the cooldownKey bucket, in the cooldown message', async () => {
                // Arrange
                const cooldownKey: any = undefined;

                mockCooldownCommand.cooldownKey
                    .mockReturnValue(cooldownKey);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect((messageHandler as any).globalTimeouts)
                    .toContainEqual(expect.objectContaining({ name: MockCooldownCommand.name }));
            });
            it('Skips execution when command is on cooldown', async () => {
                // Arrange
                mockBroadcaster.getBroadcaster
                    .mockResolvedValue(<unknown>{
                        isFollowedBy: jest.fn<HelixPrivilegedUser['isFollowedBy']>().mockResolvedValue(false),
                    } as HelixPrivilegedUser);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, unknownUser);
                await messageHandler.handle('#channel', 'user', command, unknownUser);

                // Assert
                expect(mockCooldownCommand.handle).toHaveBeenCalledTimes(1);
            });
            it('Broadcaster does not apply cooldown to commands', async () => {
                // Arrange
                const broadcasterUser: ChatUser = {
                    isBroadcaster: true,
                } as unknown as ChatUser;

                mockBroadcaster.getBroadcaster
                    .mockResolvedValue(<unknown>{
                        isFollowedBy: jest.fn<HelixPrivilegedUser['isFollowedBy']>().mockResolvedValue(true),
                    } as HelixPrivilegedUser);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, broadcasterUser);
                await messageHandler.handle('#channel', 'user', command, broadcasterUser);

                // Assert
                expect(mockCooldownCommand.handle).toHaveBeenCalledTimes(2);
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

                mockBroadcaster.getBroadcaster
                    .mockResolvedValue(<unknown>{
                        isFollowedBy: jest.fn<HelixPrivilegedUser['isFollowedBy']>().mockResolvedValue(true),
                    } as HelixPrivilegedUser);

                mockCooldownCommand.handle
                    .mockResolvedValue(undefined);

                // Act
                await messageHandler.handle('#channel', 'user', command, user);
                jest.advanceTimersByTime(expectedCooldown * 1000);
                await messageHandler.handle('#channel', 'user', command, user);

                // Assert
                expect(mockCooldownCommand.handle).toHaveBeenCalledTimes(2);
            });
        });
    });
});
