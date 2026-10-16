import { EventSubChannelModeratorEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';

@injectable()
export default class ModeratorEventHandler {
    constructor(
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    /**
     * Records the event of a user being added as a moderator to the channel
     * @param event Moderator Event
     */
    async addModerator(event: EventSubChannelModeratorEvent): Promise<void> {
        try {
            await this.channelEventRepository.addUserAsMod(event);
            this.logger.info(`User ${event.userDisplayName}: added as moderator for ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
        } catch (error) {
            this.logger.error('Unable to store Moderator Add event in DB', error);
        }
    }

    /**
     * Records the event of a user being remove as a moderator to the channel
     * @param event Moderator Event
     */
    async removeModerator(event: EventSubChannelModeratorEvent): Promise<void> {
        try {
            await this.channelEventRepository.removeUserAsMod(event);
            this.logger.info(`User ${event.userDisplayName}: removed as moderator for ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
        } catch (error) {
            this.logger.error('Unable to store Moderator Remove event in DB', error);
        }
    }
}
