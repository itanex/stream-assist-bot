// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatMessage, ChatRaidInfo, UserNotice } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import {
    IRaidStreamEvent,
    ISubscriptionStreamEvent,
    MessageHandler,
    RaidHandler,
    SubscriptionHandlers,
} from './handlers';
import InjectionTypes from '../dependency-management/types';

@injectable()
export default class ChatBot {
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(MessageHandler) private messageHandler: MessageHandler,
        @inject(RaidHandler) private raidHandler: IRaidStreamEvent,
        @inject(SubscriptionHandlers) private subscriptionHandlers: ISubscriptionStreamEvent,
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
        this.chatClient.onSubExtend(this.subscriptionHandlers.onSubExtend);
        this.chatClient.onResub(this.subscriptionHandlers.onResubHandler);
        this.chatClient.onSub(this.subscriptionHandlers.onSubscribe);
        this.chatClient.onCommunitySub(this.subscriptionHandlers.onCommunitySub);
        this.chatClient.onSubGift(this.subscriptionHandlers.onSubGift);

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

        this.chatClient.connect();
    }

    async shutdown() {
        return this.chatClient.quit();
    }
}
