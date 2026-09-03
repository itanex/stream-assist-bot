import { EventSubChannelFollowEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';

@injectable()
export default class FollowerEventHandler {
    constructor(
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    /**
     * Records the event of a user being added as a moderator to the channel
     * @param event Moderator Event
     */
    async follow(event: EventSubChannelFollowEvent): Promise<void> {
        return this.channelEventRepository
            .saveFollowEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Follow event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`User ${event.userDisplayName}: followed ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
            });
    }
}
