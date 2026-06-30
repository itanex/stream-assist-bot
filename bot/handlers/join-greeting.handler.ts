import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import StreamStateService from '../utilities/stream-state.service';

const MOD_GREETING = (name: string) => `Uh oh, the mods are here! Welcome @${name}, keeping us all in line as always.`;
const VIP_GREETING = (name: string) => `Hey @${name}, welcome in! Always great to see you here.`;

@injectable()
export default class JoinGreetingHandler {
    private greetedUsers = new Set<string>();

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(StreamStateService) private streamStateService: StreamStateService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.streamStateService.onOffline(() => this.greetedUsers.clear());
    }

    async greetIfEligible(channel: string, user: ChatUser): Promise<void> {
        if (!this.streamStateService.isOnline) return;
        if (!user.isMod && !user.isVip) return;
        if (this.greetedUsers.has(user.userId)) return;

        const message = user.isMod
            ? MOD_GREETING(user.displayName)
            : VIP_GREETING(user.displayName);

        await this.chatClient.say(channel, message);
        this.greetedUsers.add(user.userId);

        this.logger.info(`* Greeted ${user.isMod ? 'mod' : 'vip'} ${user.displayName} in ${channel}`);
    }
}

export {
    MOD_GREETING,
    VIP_GREETING,
}
