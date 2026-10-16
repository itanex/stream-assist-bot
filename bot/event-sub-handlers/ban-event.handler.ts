import { EventSubChannelBanEvent, EventSubChannelUnbanEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import BanEventRepository from '../repositories/ban-event.repository.js';

@injectable()
export default class BanEventHandler {
    constructor(
        @inject(BanEventRepository) private banEventRepository: BanEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async onBanEvent(event: EventSubChannelBanEvent): Promise<void> {
        try {
            await this.banEventRepository.saveBanEvent(event);
            this.logger.info(`Ban Event: ${event.userDisplayName} - ${event.reason} (${event.isPermanent})`);
        } catch (error) {
            this.logger.error('Unable to store Ban Event in DB', error);
        }
    }

    async onUnbanEvent(event: EventSubChannelUnbanEvent): Promise<void> {
        try {
            const record = await this.banEventRepository.saveUnbanEvent(event);
            this.logger.info(`Unban Event: ${record.userDisplayName} - ${record.reason}`);
        } catch (error) {
            this.logger.error('Unable to store Unban Event in DB', error);
        }
    }
}
