import { EventSubChannelRaidEvent } from '@twurple/eventsub-base';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'RaidEvent',
    paranoid: true,
})
export default class RaidEvent extends Model {
    /**
     * The date when the raid occured.
     */
    @Column({
        type: DataType.DATE,
    })
    raidDate: Date;

    /**
     * The amount of viewers in the raid.
     */
    @Column({
        type: DataType.INTEGER,
    })
    viewers: number;

    /**
     * The ID of the broadcaster.
     */
    @Column({
        type: DataType.STRING(20),
    })
    raidingBroadcasterId: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidingBroadcasterName: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidingBroadcasterDisplayName: string;

    /**
     * The ID of the raiding user.
     */
    @Column({
        type: DataType.STRING(20),
    })
    raidedBroadcasterId: string;

    /**
     * The name of the raiding user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidedBroadcasterName: string;

    /**
     * The display name of the raiding user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidedBroadcasterDisplayName: string;

    /**
     * Records the event of the raiding broadcaster and the raided broadcaster
     * @param event Raid Event
     * @returns Raid Event Record
     */
    static async raid(event: EventSubChannelRaidEvent): Promise<RaidEvent> {
        const record: Partial<RaidEvent> = {
            raidDate: new Date(),
            raidingBroadcasterId: event.raidingBroadcasterId,
            raidingBroadcasterName: event.raidingBroadcasterName,
            raidingBroadcasterDisplayName: event.raidingBroadcasterDisplayName,
            raidedBroadcasterId: event.raidedBroadcasterId,
            raidedBroadcasterName: event.raidedBroadcasterName,
            raidedBroadcasterDisplayName: event.raidedBroadcasterDisplayName,
        };

        return this
            .create(record);
    }
}
