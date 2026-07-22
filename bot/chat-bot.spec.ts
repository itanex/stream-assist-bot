import 'reflect-metadata';
import { ChatClient } from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { Container } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../dependency-management/types';
import ChatBot from './chat-bot';
import { MessageHandler, RaidHandler, SubscriptionHandler } from './handlers';
import {
    BanEventHandler,
    ChannelPointEventHandler,
    CheerEventHandler,
    FollowerEventHandler,
    ModeratorEventHandler,
    RaidEventHandler,
    StreamEventHandler,
} from './event-sub-handlers';
import { isUserAuthenticated } from './auth/authProvider';
import StreamStateService from './utilities/stream-state.service';
import JoinGreetingHandler from './handlers/join-greeting.handler';

jest.mock('./auth/authProvider', () => ({
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
} as EventSubWsListener;

const mockInitialize = jest.fn();
const mockStreamStateService = {
    initialize: mockInitialize,
} as unknown as StreamStateService;

const mockLogger: winston.Logger = <unknown>{
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as winston.Logger;

const emptyHandler = <unknown>{} as never;

describe('ChatBot start() guard', () => {
    const container: Container = new Container();
    let chatBot: ChatBot;

    beforeEach(() => {
        jest.resetAllMocks();
        container.unbindAll();

        container.bind<ChatClient>(ChatClient).toConstantValue(mockChatClient);
        container.bind<EventSubWsListener>(EventSubWsListener).toConstantValue(mockEventSubWsListener);
        container.bind<winston.Logger>(InjectionTypes.Logger).toConstantValue(mockLogger);
        container.bind(MessageHandler).toConstantValue(emptyHandler);
        container.bind(RaidHandler).toConstantValue(emptyHandler);
        container.bind(SubscriptionHandler).toConstantValue(emptyHandler);
        container.bind(BanEventHandler).toConstantValue(emptyHandler);
        container.bind(ChannelPointEventHandler).toConstantValue(emptyHandler);
        container.bind(CheerEventHandler).toConstantValue(emptyHandler);
        container.bind(FollowerEventHandler).toConstantValue(emptyHandler);
        container.bind(ModeratorEventHandler).toConstantValue(emptyHandler);
        container.bind(RaidEventHandler).toConstantValue(emptyHandler);
        container.bind(StreamEventHandler).toConstantValue(emptyHandler);
        container.bind(JoinGreetingHandler).toConstantValue(emptyHandler);
        container.bind(StreamStateService).toConstantValue(mockStreamStateService);
        container.bind(ChatBot).to(ChatBot);

        chatBot = container.get(ChatBot);
    });

    it('returns early with a warning when user is not authenticated', async () => {
        // Arrange
        (isUserAuthenticated as jest.Mock).mockReturnValue(false);

        // Act
        await chatBot.start();

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
        (isUserAuthenticated as jest.Mock).mockReturnValue(true);

        // Act
        await chatBot.start();

        // Assert
        expect(mockChatClient.connect).toHaveBeenCalledTimes(1);
        expect(mockEventSubWsListener.start).toHaveBeenCalledTimes(1);
        expect(mockStreamStateService.initialize).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });
});
