import { EventSubChannelCheerEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';

@injectable()
export default class CheerEventHandler {
    constructor(
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async onCheer(event: EventSubChannelCheerEvent): Promise<void> {
        return this.channelEventRepository
            .saveCheerEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Cheer Event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`Cheer Event called ${event.userDisplayName}: cheered ${event.bits} (msg: ${event.message})`);
            });
    }
}
