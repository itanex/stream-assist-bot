import 'reflect-metadata';
import {
    ChatClient,
    ChatCommunitySubInfo,
    ChatMessage,
    ChatRaidInfo,
    ChatSubExtendInfo,
    ChatSubGiftInfo,
    ChatSubInfo,
    UserNotice,
} from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import {
    EventSubChannelBanEvent,
    EventSubChannelCheerEvent,
    EventSubChannelFollowEvent,
    EventSubChannelModeratorEvent,
    EventSubChannelRaidEvent,
    EventSubChannelRedemptionAddEvent,
    EventSubChannelUnbanEvent,
    EventSubStreamOfflineEvent,
    EventSubStreamOnlineEvent,
} from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import {
    type IRaidStreamEvent,
    type ISubscriptionHandler,
    MessageHandler,
    RaidHandler,
    SubscriptionHandler,
} from './handlers/index.js';
import {
    BanEventHandler,
    ChannelPointEventHandler,
    CheerEventHandler,
    FollowerEventHandler,
    ModeratorEventHandler,
    RaidEventHandler,
    StreamEventHandler,
} from './event-sub-handlers/index.js';
import InjectionTypes from '../dependency-management/types.js';
import { type Environment } from '../configurations/environment.js';
import { isUserAuthenticated } from './auth/authProvider.js';
import { StreamStateService } from './services/index.js';
import JoinGreetingHandler from './handlers/join-greeting.handler.js';

export interface IChatBot {
    configure: () => IChatBot;
    start: () => Promise<void>;
    restart: () => void;
    shutdown: () => void;
}

/**
 * Twurple 7.1.0 has no `sourceChannelId` getter for shared-chat messages (added in 8.x).
 * Reads the raw tag until the ESM migration upgrades Twurple - swap for `msg.sourceChannelId` then.
 */
function getSourceChannelId(msg: ChatMessage): string | null {
    return msg.tags.get('source-room-id') ?? null;
}

@injectable()
export default class ChatBot implements IChatBot {
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(EventSubWsListener) private eventSubWsListener: EventSubWsListener,
        @inject(MessageHandler) private messageHandler: MessageHandler,
        @inject(RaidHandler) private raidHandler: IRaidStreamEvent,
        @inject(SubscriptionHandler) private subscriptionHandler: ISubscriptionHandler,
        @inject(BanEventHandler) private banEventHandler: BanEventHandler,
        @inject(ChannelPointEventHandler) private channelPointEventHandler: ChannelPointEventHandler,
        @inject(CheerEventHandler) private cheerEventHandler: CheerEventHandler,
        @inject(FollowerEventHandler) private followerEventHandler: FollowerEventHandler,
        @inject(ModeratorEventHandler) private moderatorEventHandler: ModeratorEventHandler,
        @inject(RaidEventHandler) private raidEventHandler: RaidEventHandler,
        @inject(StreamEventHandler) private streamEventHandler: StreamEventHandler,
        @inject(StreamStateService) private streamStateService: StreamStateService,
        @inject(JoinGreetingHandler) private joinGreetingHandler: JoinGreetingHandler,
        @inject(InjectionTypes.Environment) private environment: Environment,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.logger.info(`** Chat Bot initialized **`);
    }

    configure(): IChatBot {
        this.chatClient.onMessage(async (channel: string, user: string, text: string, msg: ChatMessage) => {
            await this.messageHandler.handle(channel, user, text, msg.userInfo, getSourceChannelId(msg));
            await this.joinGreetingHandler.greetIfEligible(channel, msg.userInfo);
        });

        this.chatClient.onRaid(async (channel: string, user: string, raidInfo: ChatRaidInfo, msg: UserNotice) => {
            await this.raidHandler.onRaid(channel, user, raidInfo, msg);
        });

        // Subscription Event Registration
        this.chatClient.onSubExtend(async (channel: string, user: string, subInfo: ChatSubExtendInfo, msg: UserNotice) => {
            await this.subscriptionHandler.onSubExtend(channel, user, subInfo, msg);
        });
        this.chatClient.onResub(async (channel: string, user: string, subInfo: ChatSubInfo, msg: UserNotice) => {
            await this.subscriptionHandler.onResubHandler(channel, user, subInfo, msg);
        });
        this.chatClient.onSub(async (channel: string, user: string, subInfo: ChatSubInfo, msg: UserNotice) => {
            await this.subscriptionHandler.onSubscribe(channel, user, subInfo, msg);
        });
        this.chatClient.onCommunitySub(async (channel: string, user: string, subInfo: ChatCommunitySubInfo, msg: UserNotice) => {
            await this.subscriptionHandler.onCommunitySub(channel, user, subInfo, msg);
        });
        this.chatClient.onSubGift(async (channel: string, user: string, subInfo: ChatSubGiftInfo, msg: UserNotice) => {
            await this.subscriptionHandler.onSubGift(channel, user, subInfo, msg);
        });

        // Authenticaiton Event Registration
        this.chatClient.onAuthenticationSuccess(() => this.logger.info('Chat Client authenticated successfully'));
        this.chatClient.onAuthenticationFailure((text: string, retryCount: number) => this.logger.error('Chat Client unable to authenticate'));

        // Chat Client specific Event Registration
        this.chatClient.onConnect(() => this.logger.info('Chat Client connected'));
        this.chatClient.onDisconnect((manual, reason) => {
            if (reason) {
                this.logger.error('Chat Client disconnected', reason);
            } else {
                this.logger.info('Chat Client disconnected');
            }
        });

        // Event Sub API registration
        this.eventSubWsListener.onChannelRedemptionAdd(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelRedemptionAddEvent): Promise<void> => {
                await this.channelPointEventHandler.onChannelPointRedeem(event);
            },
        );

        this.eventSubWsListener.onChannelCheer(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelCheerEvent): Promise<void> => {
                await this.cheerEventHandler.onCheer(event);
            },
        );

        this.eventSubWsListener.onChannelBan(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelBanEvent): Promise<void> => {
                await this.banEventHandler.onBanEvent(event);
            },
        );

        this.eventSubWsListener.onChannelUnban(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelUnbanEvent): Promise<void> => {
                await this.banEventHandler.onUnbanEvent(event);
            },
        );

        // Requires that a moderator with permission is part of the subscription
        // Using the broadcaster as that user
        this.eventSubWsListener.onChannelFollow(
            `${this.environment.twitchBot.broadcaster.id}`,
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelFollowEvent): Promise<void> => {
                await this.followerEventHandler.follow(event);
            },
        );

        this.eventSubWsListener.onChannelModeratorAdd(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelModeratorEvent): Promise<void> => {
                await this.moderatorEventHandler.addModerator(event);
            },
        );

        this.eventSubWsListener.onChannelModeratorRemove(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelModeratorEvent): Promise<void> => {
                await this.moderatorEventHandler.removeModerator(event);
            },
        );

        this.eventSubWsListener.onChannelRaidTo(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelRaidEvent): Promise<void> => {
                await this.raidEventHandler.raid(event);
            },
        );

        this.eventSubWsListener.onChannelRaidFrom(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubChannelRaidEvent): Promise<void> => {
                await this.raidEventHandler.raid(event);
            },
        );

        this.eventSubWsListener.onStreamOnline(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubStreamOnlineEvent): Promise<void> => {
                await this.streamEventHandler.streamOnline(event);
                this.streamStateService.setOnline();
            },
        );

        this.eventSubWsListener.onStreamOffline(
            `${this.environment.twitchBot.broadcaster.id}`,
            async (event: EventSubStreamOfflineEvent): Promise<void> => {
                await this.streamEventHandler.streamOffline(event);
                this.streamStateService.setOffline();
            },
        );

        return this;
    }

    async start(): Promise<void> {
        if (!isUserAuthenticated()) {
            this.logger.warn('ChatBot start called without an authenticated user - complete the OAuth flow at the auth server URL');
            return;
        }

        this.chatClient.connect();
        await this.streamStateService.initialize();
        this.eventSubWsListener.start();
    }

    async restart(): Promise<void> {
        this.shutdown();
        await this.start();
    }

    shutdown(): void {
        this.eventSubWsListener.stop();
        return this.chatClient.quit();
    }
}
