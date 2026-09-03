import { inject, injectable } from 'inversify';
import { ChatRaidInfo } from '@twurple/chat';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { Raiders } from '../../database/index.js';

@injectable()
export default class RaidRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Gets the last raid record from the database
     * @returns the raider record of the last raid
     */
    async getLastRaid(): Promise<Raiders | null> {
        return Raiders
            .findOne({
                order: [['time', 'DESC']],
            });
    }

    /**
     * Saves the provided raid details to the database
     * @returns the raid record saved
     */
    async saveRaid(raidInfo: ChatRaidInfo): Promise<Raiders | null> {
        const raider = Raiders.build({
            raider: raidInfo.displayName,
            time: new Date(),
            viewerCount: raidInfo.viewerCount,
        }, {
            isNewRecord: true,
        });

        try {
            return await raider.save();
        } catch (error) {
            this.logger.error(`Error saving Raider record`, error);
        }

        return null;
    }
}
