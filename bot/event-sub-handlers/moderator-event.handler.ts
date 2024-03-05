import { EventSubChannelModeratorEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ModeratorEvent } from '../../database';

@injectable()
export default class ModeratorEventHandler {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    /**
     * Records the event of a user being added as a moderator to the channel
     * @param event Moderator Event
     */
    async addModerator(event: EventSubChannelModeratorEvent): Promise<void> {
        return ModeratorEvent
            .addUserAsMod(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Moderator Add event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`User ${event.userDisplayName}: added as moderator for ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
            });
    }

    /**
     * Records the event of a user being remove as a moderator to the channel
     * @param event Moderator Event
     */
    async removeModerator(event: EventSubChannelModeratorEvent): Promise<void> {
        return ModeratorEvent
            .removeUserAsMod(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Moderator Remove event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`User ${event.userDisplayName}: removed as moderator for ${event.broadcasterDisplayName} on ${(new Date()).toDateString()}`);
            });
    }
}
