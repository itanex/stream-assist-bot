import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { GreetUserService, StreamStateService } from '../services/index.js';

const MOD_GREETING = (name: string) => `Uh oh, the mods are here! Welcome @${name}, keeping us all in line as always.`;
const VIP_GREETING = (name: string) => `Hey @${name}, welcome in! Always great to see you here.`;

@injectable()
export default class JoinGreetingHandler {
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(StreamStateService) private streamStateService: StreamStateService,
        @inject(GreetUserService) private greetUserService: GreetUserService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.streamStateService.onOffline(() => this.greetUserService.clear());
    }

    async greetIfEligible(channel: string, user: ChatUser): Promise<void> {
        if (!this.streamStateService.isOnline) return;
        if (!user.isMod && !user.isVip) return;
        if (this.greetUserService.hasUser(user)) return;

        const message = user.isMod
            ? MOD_GREETING(user.displayName)
            : VIP_GREETING(user.displayName);

        await this.chatClient.say(channel, message);
        this.greetUserService.saveUser(user);

        this.logger.info(`* Greeted ${user.isMod ? 'mod' : 'vip'} ${user.displayName} in ${channel}`);
    }
}

export {
    MOD_GREETING,
    VIP_GREETING,
};
