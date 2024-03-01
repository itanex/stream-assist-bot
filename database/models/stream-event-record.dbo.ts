import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { Op } from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'StreamEventRecord',
    paranoid: true,
})
export default class StreamEventRecord extends Model {
    /**
     * The ID of the stream going live.
     */
    @Column({
        type: DataType.STRING(40),
    })
    streamId: string;

    /**
     * The type of the stream going live.
     */
    @Column({
        type: DataType.STRING(20),
    })
    type: string;

    /**
     * The date and time when the stream was started.
     */
    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    startDate: Date;

    /**
     * The date and time when the stream was ended.
     */
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    endDate?: Date;

    /**
     * The ID of the broadcaster.
     */
    @Column({
        type: DataType.STRING(20),
    })
    broadcasterId: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterName: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterDisplayName: string;

    /**
     * Gets the last stream in the DB for the provided broadcaster
     * @param broadcasterId the broadcaster to get the stream record of
     * @returns the found stream record
     */
    static async getLastStream(broadcasterId: string): Promise<StreamEventRecord> {
        return this
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
    static async saveStreamStartEvent(event: EventSubStreamOnlineEvent): Promise<StreamEventRecord> {
        const record: Partial<StreamEventRecord> = {
            streamId: event.id,
            type: event.type,
            startDate: event.startDate,
            endDate: null,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
        };

        return this
            .create(record);
    }

    /**
     * Save the provided end stream event in the DB
     * @param endDate the datetime of the stream event (not on event)
     * @param event the end stream event
     * @returns the end stream event db record
     */
    static async saveStreamEndEvent(endDate: Date, event: EventSubStreamOfflineEvent): Promise<[number, StreamEventRecord[]]> {
        return this
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
