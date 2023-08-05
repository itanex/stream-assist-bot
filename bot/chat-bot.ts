// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatRaidInfo, ChatUser, UserNotice } from '@twurple/chat';
import { TwitchPrivateMessage } from '@twurple/chat/lib/commands/TwitchPrivateMessage';
import { inject, injectable, multiInject } from 'inversify';
import winston from 'winston';
import {
    IRaidStreamEvent,
    // ISubscriptionStreamEvent,
    MessageHandler,
    RaidHandler,
    // SubscriptionHandlers
} from './handlers';
import { TYPES } from '../dependency-management/types';

@injectable()
export default class ChatBot {
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(MessageHandler) private messageHandler: MessageHandler,
        @inject(RaidHandler) private raidHandler: IRaidStreamEvent,
        // @inject(SubscriptionHandlers) private subscriptionHandlers: ISubscriptionStreamEvent,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        this.logger.info(`** Chat Bot initialized **`);
    }

    start() {
        this.chatClient.onMessage(async (channel: string, user: string, message: string, msg: TwitchPrivateMessage) => {
            await this.messageHandler.handle(channel, user, message, msg);
        });

        this.chatClient.onRaid(async (channel: string, user: string, raidInfo: ChatRaidInfo, msg: UserNotice) => {
            await this.raidHandler.onRaid(channel, user, raidInfo, msg);
        });

        // this.chatClient.onSubExtend(this.subscriptionHandlers.onSubExtend);
        // this.chatClient.onResub(this.subscriptionHandlers.onResubHandler);
        // this.chatClient.onSub(this.subscriptionHandlers.onSubscribe);
        // this.chatClient.onCommunitySub(this.subscriptionHandlers.onCommunitySub);
        // this.chatClient.onSubGift(this.subscriptionHandlers.onSubGift);

        this.chatClient.connect()
            .then(() => this.logger.info('--Start up -- Chat Client Connected'))
            .catch(err => this.logger.error(`-- Start up --`, err));
    }
}
