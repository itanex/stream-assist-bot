import { ApiClient } from '@twurple/api';
import { ChatRaidInfo, ChatUser, UserNotice } from '@twurple/chat';
import dayjs from 'dayjs';
import { inject, injectable, multiInject, named } from 'inversify';
import winston from 'winston';
import environment from '../../configurations/environment';
import { ICommandHandler, ShoutOutCommand } from '../commands';
import { TYPES } from '../../dependency-management/types';

export interface IRaidStreamEvent {
    onRaid(channel: string, user: string, raidInfo: ChatRaidInfo, message: UserNotice): Promise<void>;
}

@injectable()
export class RaidHandler implements IRaidStreamEvent {
    private readonly command = 'raid triggered shout out';
    private readonly shoutOutCommand: ShoutOutCommand;
    /**
     *
     */
    constructor(
        @inject(ApiClient) private apiClient: ApiClient,
        @multiInject(TYPES.CommandHandlers) commandHandlers: ICommandHandler[],
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        // clear
        this.shoutOutCommand = commandHandlers.find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;
    }

    async onRaid(channel: string, user: string, raidInfo: ChatRaidInfo, message: UserNotice): Promise<void> {
        this.apiClient.chat.sendAnnouncement(environment.broadcasterId, environment.broadcasterId, {
            message: `RAID: Thank you, ${raidInfo.displayName}, for bringing the ${raidInfo.viewerCount} viewer(s) with you!`,
            color: 'primary',
        });

        setTimeout(() => {
            this.shoutOutCommand.handle(channel, this.command, new ChatUser(user, null), this.command, [raidInfo.displayName], true);
        }, 3000);

        // Repository.create<RaiderRecord>(DataKeys.Raiders, {
        //     raider: raidInfo.displayName,
        //     time: dayjs().toISOString(),
        //     viewerCount: raidInfo.viewerCount,
        // });

        this.logger.info(`* Executed Raid Handler :: ${user}|${raidInfo.displayName} > Viewers: ${raidInfo.viewerCount}`);
    }
}
