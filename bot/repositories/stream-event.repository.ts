import { inject, injectable } from 'inversify';
import { Op } from 'sequelize';
import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { StreamEventRecord } from '../../database/index.js';

@injectable()
export default class StreamEventRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Gets the last stream in the DB for the provided broadcaster
     * @param broadcasterId the broadcaster to get the stream record of
     * @returns the found stream record
     */
    async getLastStream(broadcasterId: string): Promise<StreamEventRecord | null> {
        return StreamEventRecord
            .findOne({
                where: {
                    broadcasterId,
                    endDate: { [Op.not]: null },
                },
                order: [['endDate', 'DESC']],
            });
    }

    /**
     * Save the provided start stream event in the DB
     * @param event the start stream event
     * @returns the start stream event db record
     */
    async saveStreamStartEvent(event: EventSubStreamOnlineEvent): Promise<StreamEventRecord | null> {
        try {
            return StreamEventRecord
                .create({
                    streamId: event.id,
                    type: event.type,
                    startDate: event.startDate,
                    endDate: null!,
                    broadcasterId: event.broadcasterId,
                    broadcasterName: event.broadcasterName,
                    broadcasterDisplayName: event.broadcasterDisplayName,
                }, {
                    isNewRecord: true,
                    validate: true,
                });
        } catch (error: any) {
            this.logger.error(`Error saving stream start record to database`, error);
        }

        return null;
    }

    /**
     * Save the provided end stream event in the DB
     * @param endDate the datetime of the stream event (not on event)
     * @param event the end stream event
     * @returns the end stream event db record
     */
    async saveStreamEndEvent(endDate: Date, event: EventSubStreamOfflineEvent): Promise<[number, StreamEventRecord[]]> {
        return StreamEventRecord
            .update(
                { endDate },
                {
                    where: {
                        endDate: null,
                        broadcasterId: event.broadcasterId,
                    },
                    returning: true,
                },
            );
    }
}
