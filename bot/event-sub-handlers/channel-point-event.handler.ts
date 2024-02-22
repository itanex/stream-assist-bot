import { EventSubChannelRedemptionAddEvent } from '@twurple/eventsub-base';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import ChannelPointRedeem from '../../database/models/channelPointRedeem.dbo';

@injectable()
export default class ChannelPointEventHandler {
    /**
     *
     */
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async onChannelPointRedeem(event: EventSubChannelRedemptionAddEvent): Promise<void> {
        return ChannelPointRedeem
            .saveRedeemEvent(event)
            .catch((reason: any) => {
                this.logger.error(`Unable to store Channel Point Redeem in DB >> ${reason}`);
            })
            .then(() => {
                this.logger.info(`Channel Point redeam called ${event.rewardTitle}: ${event.rewardCost} (${event.rewardId})`);
            });
    }
}
