import { EventSubChannelFollowEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { FollowEvent, ModeratorEvent } from '../../database';

@injectable()
export default class FollowerEventHandler {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    /**
     * Records the event of a user being added as a moderator to the channel
     * @param event Moderator Event
     */
    async follow(event: EventSubChannelFollowEvent): Promise<void> {
        return FollowEvent
            .follow(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Follow event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`User ${event.userDisplayName}: followed ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
            });
    }
}
