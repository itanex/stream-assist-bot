import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'ChannelPointRedeem',
    paranoid: true,
})
export default class ChannelPointRedeem extends Model {
    /**
     * The ID of the redemption.
     */
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    eventId!: string;

    /**
     * The ID of the broadcaster.
     */
    @Column({
        type: DataType.STRING(20),
    })
    broadcasterId!: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterName!: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterDisplayName!: string;

    /**
     * The ID of the user.
     */
    @Column({
        type: DataType.STRING(20),
    })
    userId!: string;

    /**
     * The name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userName!: string;

    /**
     * The display name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName!: string;

    /**
     * The input text given by the user.
     *
     * If there is no input to be given, this is an empty string.
     */
    @Column({
        type: DataType.STRING(255),
    })
    input!: string;

    /**
     * The status of the redemption.
     */
    @Column({
        type: DataType.STRING(20),
    })
    status!: string;

    /**
     * The ID of the reward that was redeemed.
     */
    @Column({
        type: DataType.UUID,
    })
    rewardId!: string;

    /**
     * The title of the reward that was redeemed.
     */
    @Column({
        type: DataType.STRING(255),
    })
    rewardTitle!: string;

    /**
     * The cost of the reward that was redeemed.
     */
    @Column({
        type: DataType.INTEGER,
    })
    rewardCost!: number;

    /**
     * The description of the reward that was redeemed.
     */
    @Column({
        type: DataType.STRING(255),
    })
    rewardPrompt!: string;

    /**
     * The time when the user redeemed the reward.
     */
    @Column({
        type: DataType.DATE,
    })
    redemptionDate!: Date;
}
