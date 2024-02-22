import { EventSubChannelCheerEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { CheerEvent } from '../../database';

@injectable()
export default class CheerEventHandler {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async onCheer(event: EventSubChannelCheerEvent): Promise<void> {
        return CheerEvent
            .saveCheerEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Cheer Event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`Cheer Event called ${event.userDisplayName}: cheered ${event.bits} (msg: ${event.message})`);
            });
    }
}
