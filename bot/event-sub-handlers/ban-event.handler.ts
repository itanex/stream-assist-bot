import { EventSubChannelBanEvent, EventSubChannelUnbanEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { BanEvent } from '../../database';

@injectable()
export default class BanEventHandler {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async onBanEvent(event: EventSubChannelBanEvent): Promise<void> {
        return BanEvent
            .saveBanEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Ban Event in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`Ban Event: ${event.userDisplayName} - ${event.reason} (${event.isPermanent})`);
            });
    }

    async onUnbanEvent(event: EventSubChannelUnbanEvent): Promise<void> {
        return BanEvent
            .saveUnbanEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Unban Event in DB >> ${reason}`);
            })
            .then((record: BanEvent) => {
                this.logger.info(`Unban Event: ${record.userDisplayName} - ${record.reason}`);
            });
    }
}
