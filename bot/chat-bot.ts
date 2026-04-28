// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
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
    IRaidStreamEvent,
    ISubscriptionHandler,
    MessageHandler,
    RaidHandler,
    SubscriptionHandler,
} from './handlers';
import {
    BanEventHandler,
    ChannelPointEventHandler,
    CheerEventHandler,
    FollowerEventHandler,
    ModeratorEventHandler,
    RaidEventHandler,
    StreamEventHandler,
} from './event-sub-handlers';
import InjectionTypes from '../dependency-management/types';
import environment from '../configurations/environment';
import { isUserAuthenticated } from './auth/authProvider';

export interface IChatBot {
    configure: () => IChatBot;
    start: () => void;
    restart: () => void;
    shutdown: () => void;
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
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.logger.info(`** Chat Bot initialized **`);
    }

    configure(): IChatBot {
        this.chatClient.onMessage(async (channel: string, user: string, text: string, msg: ChatMessage) => {
            this.messageHandler.handle(channel, user, text, msg.userInfo);
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
            environment.twitchBot.userId,
            (event: EventSubChannelRedemptionAddEvent): void => {
                this.channelPointEventHandler.onChannelPointRedeem(event);
            },
        );

        this.eventSubWsListener.onChannelCheer(
            environment.twitchBot.userId,
            (event: EventSubChannelCheerEvent): void => {
                this.cheerEventHandler.onCheer(event);
            },
        );

        this.eventSubWsListener.onChannelBan(
            environment.twitchBot.userId,
            (event: EventSubChannelBanEvent): void => {
                this.banEventHandler.onBanEvent(event);
            },
        );

        this.eventSubWsListener.onChannelUnban(
            environment.twitchBot.userId,
            (event: EventSubChannelUnbanEvent): void => {
                this.banEventHandler.onUnbanEvent(event);
            },
        );

        // Requires that a moderator with permission is part of the subscription
        // Using the broadcaster as that user
        this.eventSubWsListener.onChannelFollow(
            environment.twitchBot.userId,
            environment.twitchBot.userId,
            (event: EventSubChannelFollowEvent): void => {
                this.followerEventHandler.follow(event);
            },
        );

        this.eventSubWsListener.onChannelModeratorAdd(
            environment.twitchBot.userId,
            (event: EventSubChannelModeratorEvent): void => {
                this.moderatorEventHandler.addModerator(event);
            },
        );

        this.eventSubWsListener.onChannelModeratorRemove(
            environment.twitchBot.userId,
            (event: EventSubChannelModeratorEvent): void => {
                this.moderatorEventHandler.removeModerator(event);
            },
        );

        this.eventSubWsListener.onChannelRaidTo(
            environment.twitchBot.userId,
            (event: EventSubChannelRaidEvent): void => {
                this.raidEventHandler.raid(event);
            },
        );

        this.eventSubWsListener.onChannelRaidFrom(
            environment.twitchBot.userId,
            (event: EventSubChannelRaidEvent): void => {
                this.raidEventHandler.raid(event);
            },
        );

        this.eventSubWsListener.onStreamOnline(
            environment.twitchBot.userId,
            (event: EventSubStreamOnlineEvent): void => {
                this.streamEventHandler.streamOnline(event);
            },
        );

        this.eventSubWsListener.onStreamOffline(
            environment.twitchBot.userId,
            (event: EventSubStreamOfflineEvent): void => {
                this.streamEventHandler.streamOffline(event);
            },
        );

        return this;
    }

    start(): void {
        if (!isUserAuthenticated()) {
            this.logger.warn('ChatBot start called without an authenticated user - complete the OAuth flow at the auth server URL');
            return;
        }

        this.chatClient.connect();
        this.eventSubWsListener.start();
    }

    restart(): void {
        this.shutdown();
        this.start();
    }

    shutdown(): void {
        this.eventSubWsListener.stop();
        return this.chatClient.quit();
    }
}
