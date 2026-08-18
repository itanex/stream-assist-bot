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
     * Records the event of a user being added as a moderator to the channel
     * @param event Raid Event
     */
    async raid(event: EventSubChannelRaidEvent): Promise<void> {
        return this.channelEventRepository
            .saveRaidEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Raid event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`${event.raidingBroadcasterDisplayName} raided ${event.raidedBroadcasterDisplayName} on ${(new Date()).toDateString()}`);
            });
    }
}
