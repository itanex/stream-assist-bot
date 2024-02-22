// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatCommunitySubInfo, ChatMessage, ChatRaidInfo, ChatSubExtendInfo, ChatSubGiftInfo, ChatSubInfo, UserNotice } from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { EventSubChannelCheerEvent, EventSubChannelRedemptionAddEvent } from '@twurple/eventsub-base';
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
    ChannelPointEventHandler,
    CheerEventHandler,
} from './event-sub-handlers';
import InjectionTypes from '../dependency-management/types';
import environment from '../configurations/environment';

@injectable()
export default class ChatBot {
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(EventSubWsListener) private eventSubWsListener: EventSubWsListener,
        @inject(MessageHandler) private messageHandler: MessageHandler,
        @inject(RaidHandler) private raidHandler: IRaidStreamEvent,
        @inject(SubscriptionHandler) private subscriptionHandler: ISubscriptionHandler,
        @inject(ChannelPointEventHandler) private channelPointEventHandler: ChannelPointEventHandler,
        @inject(CheerEventHandler) private cheerEventHandler: CheerEventHandler,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.logger.info(`** Chat Bot initialized **`);
    }

    async start(): Promise<void> {
        this.chatClient.onMessage((channel: string, user: string, text: string, msg: ChatMessage) => {
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
                this.logger.error('Chat Client disonnected', reason);
            } else {
                this.logger.info('Chat Client disonnected');
            }
        });

        // Event Sub API registration
        this.eventSubWsListener.onChannelRedemptionAdd(
            environment.twitchBot.broadcaster.id,
            (event: EventSubChannelRedemptionAddEvent): void => {
                this.channelPointEventHandler.onChannelPointRedeem(event);
            },
        );

        this.eventSubWsListener.onChannelCheer(
            environment.twitchBot.broadcaster.id,
            (event: EventSubChannelCheerEvent): void => {
                this.cheerEventHandler.onCheer(event);
            },
        );

        // Connect Client
        this.chatClient.connect();

        // Connect web socket listener
        this.eventSubWsListener.start();
    }

    async shutdown() {
        this.eventSubWsListener.stop();
        return this.chatClient.quit();
    }
}
