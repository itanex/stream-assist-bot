import { EventSubChannelRaidEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';

@injectable()
export default class RaidEventHandler {
    constructor(
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    /**
     * Records a raid into or out of the channel
     * @param event Raid Event
     */
    async raid(event: EventSubChannelRaidEvent): Promise<void> {
        try {
            await this.channelEventRepository.saveRaidEvent(event);
            this.logger.info(`${event.raidingBroadcasterDisplayName} raided ${event.raidedBroadcasterDisplayName} on ${(new Date()).toDateString()}`);
        } catch (error) {
            this.logger.error('Unable to store Raid event in DB', error);
        }
    }
}
