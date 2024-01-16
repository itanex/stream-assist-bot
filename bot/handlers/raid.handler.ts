import { ApiClient } from '@twurple/api';
import { ChatRaidInfo, ChatUser, UserNotice } from '@twurple/chat';
import dayjs from 'dayjs';
import { inject, injectable, multiInject, named } from 'inversify';
import winston from 'winston';
import environment from '../../configurations/environment';
import { ICommandHandler, ShoutOutCommand } from '../commands';
import InjectionTypes from '../../dependency-management/types';
import Database from '../../database/database';
import { Raiders } from '../../database';

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
        @multiInject(InjectionTypes.CommandHandlers) commandHandlers: ICommandHandler[],
        @inject(Database) private database: Database,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        // clear
        this.shoutOutCommand = commandHandlers.find(x => x.constructor.name === `${ShoutOutCommand.name}`) as ShoutOutCommand;
    }

    async onRaid(channel: string, user: string, raidInfo: ChatRaidInfo, message: UserNotice): Promise<void> {
        this.apiClient.chat.sendAnnouncement(environment.twitchBot.broadcaster.id, {
            message: `RAID: Thank you, ${raidInfo.displayName}, for bringing the ${raidInfo.viewerCount} viewer(s) with you!`,
            color: 'primary',
        });

        // TODO: Deal with this hack, may be an issue in the messaging interface
        const chatUser = {
            displayName: user,
        } as ChatUser;

        setTimeout(() => {
            this.shoutOutCommand.handle(channel, this.command, chatUser, this.command, [raidInfo.displayName], true);
        }, 3000);

        const raider = Raiders.build({
            raider: raidInfo.displayName,
            time: dayjs().toISOString(),
            viewerCount: raidInfo.viewerCount,
        }, {
            isNewRecord: true,
        });

        await raider.save();

        this.logger.info(`* Executed Raid Handler :: ${user}|${raidInfo.displayName} > Viewers: ${raidInfo.viewerCount}`);
    }
}
