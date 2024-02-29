import { EventSubStreamOfflineEvent, EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
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
