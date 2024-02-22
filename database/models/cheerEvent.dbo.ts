import { EventSubChannelCheerEvent } from '@twurple/eventsub-base';
import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'CheerEvent',
    paranoid: true,
})
export default class CheerEvent extends Model {
    /** The amount of bits cheered */
    @Column({
        type: DataType.INTEGER,
    })
    bits: Number;

    @Column({
        type: DataType.BOOLEAN,
    })
    isAnonymous: boolean;

    @Column({
        type: DataType.STRING(255),
    })
    message: string;

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
     * The ID of the user.
     */
    @Column({
        type: DataType.STRING(20),
    })
    userId: string;

    /**
     * The name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userName: string;

    /**
     * The display name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName: string;

    /**
     * Saves the event record into the database as per the mapping results required
     * @param event The event record to save information from into the database
     * @returns The stored event record
     */
    static async saveCheerEvent(event: EventSubChannelCheerEvent): Promise<CheerEvent> {
        const record: Partial<CheerEvent> = {
            bits: event.bits,
            isAnonymous: event.isAnonymous,
            message: event.message,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return CheerEvent
            .create(record);
    }
}
