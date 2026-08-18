import { EventSubChannelRedemptionAddEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';

@injectable()
export default class ChannelPointEventHandler {
    constructor(
        @inject(ChannelEventRepository) private channelEventRepository: ChannelEventRepository,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async onChannelPointRedeem(event: EventSubChannelRedemptionAddEvent): Promise<void> {
        return this.channelEventRepository
            .saveChannelPointRedeemEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Channel Point Redeem in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`Channel Point redeam called ${event.rewardTitle}: ${event.rewardCost} (${event.rewardId})`);
            });
    }
}
