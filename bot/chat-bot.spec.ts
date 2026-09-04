import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatClient } from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { StreamStateService } from './services/index.js';
import { mockLogger } from '../tests/common.mocks.js';
import { type Environment } from '../configurations/environment.js';

type AuthProviderModule = typeof import('./auth/authProvider.js');
type ChatBotModule = typeof import('./chat-bot.js');

jest.unstable_mockModule('./auth/authProvider', () => ({
    isUserAuthenticated: jest.fn(),
}));

const mockChatClient = <unknown>{
    connect: jest.fn(),
    say: jest.fn(),
    onMessage: jest.fn(),
    onRaid: jest.fn(),
    onSubExtend: jest.fn(),
    onResub: jest.fn(),
    onSub: jest.fn(),
    onCommunitySub: jest.fn(),
    onSubGift: jest.fn(),
    onAuthenticationSuccess: jest.fn(),
    onAuthenticationFailure: jest.fn(),
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
} as ChatClient;

const mockEventSubWsListener = <unknown>{
    start: jest.fn(),
    stop: jest.fn(),
    onChannelRedemptionAdd: jest.fn(),
    onChannelCheer: jest.fn(),
    onChannelBan: jest.fn(),
    onChannelUnban: jest.fn(),
    onChannelFollow: jest.fn(),
    onChannelModeratorAdd: jest.fn(),
    onChannelModeratorRemove: jest.fn(),
    onChannelRaidTo: jest.fn(),
    onChannelRaidFrom: jest.fn(),
    onStreamOnline: jest.fn(),
    onStreamOffline: jest.fn(),
} as jest.Mocked<EventSubWsListener>;

const mockStreamStateService = <unknown>{
    initialize: jest.fn(),
} as jest.Mocked<StreamStateService>;

const emptyHandler = <unknown>{} as never;

const mockEnvironment = <unknown>{

} as Environment;

describe('ChatBot start() guard', () => {
    let isUserAuthenticated: jest.Mocked<AuthProviderModule['isUserAuthenticated']>;

    let ChatBot: ChatBotModule['default'];
    let subject: InstanceType<ChatBotModule['default']>;

    beforeEach(async () => {
        jest.resetAllMocks();

        ({ default: ChatBot } = await import('./chat-bot.js'));

        isUserAuthenticated = (await import('./auth/authProvider.js'))
            .isUserAuthenticated as jest.Mocked<AuthProviderModule['isUserAuthenticated']>;

        subject = new ChatBot(
            mockChatClient,
            mockEventSubWsListener,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            emptyHandler,
            mockStreamStateService,
            emptyHandler,
            mockEnvironment,
            mockLogger,
        );
    });

    it('returns early with a warning when user is not authenticated', async () => {
        // Arrange
        isUserAuthenticated
            .mockReturnValue(false);

        // Act
        await subject.start();

        // Assert
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('OAuth'),
        );
        expect(mockChatClient.connect).not.toHaveBeenCalled();
        expect(mockEventSubWsListener.start).not.toHaveBeenCalled();
        expect(mockStreamStateService.initialize).not.toHaveBeenCalled();
    });

    it('connects chat client and starts EventSub listener when user is authenticated', async () => {
        // Arrange
        isUserAuthenticated
            .mockReturnValue(true);

        // Act
        await subject.start();

        // Assert
        expect(mockChatClient.connect).toHaveBeenCalledTimes(1);
        expect(mockEventSubWsListener.start).toHaveBeenCalledTimes(1);
        expect(mockStreamStateService.initialize).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });
});
