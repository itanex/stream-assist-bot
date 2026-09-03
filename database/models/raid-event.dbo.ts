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
    raidDate!: Date;

    /**
     * The amount of viewers in the raid.
     */
    @Column({
        type: DataType.INTEGER,
    })
    viewers!: number;

    /**
     * The ID of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidingBroadcasterId!: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidingBroadcasterName!: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidingBroadcasterDisplayName!: string;

    /**
     * The ID of the raiding user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidedBroadcasterId!: string;

    /**
     * The name of the raiding user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidedBroadcasterName!: string;

    /**
     * The display name of the raiding user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    raidedBroadcasterDisplayName!: string;
}
