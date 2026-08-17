import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'BanEvent',
    paranoid: true,
})
export default class BanEvent extends Model {
    /**
     * The reason behind the ban.
     */
    @Column({
        type: DataType.STRING(255),
    })
    reason!: string;

    /**
     * The date and time when the user was banned or put in a timeout.
     */
    @Column({
        type: DataType.DATE,
    })
    startDate!: Date;

    /**
     * If it is a timeout, the date and time when the timeout will end. Will be null if permanent ban.
     */
    @Column({
        type: DataType.DATE,
    })
    endDate!: Date;

    /**
     * Whether the ban is permanent.
     */
    @Column({
        type: DataType.BOOLEAN,
    })
    isPermanent!: boolean;

    /**
    * The ID of the moderator.
    */
    @Column({
        type: DataType.STRING(20),
    })
    moderatorId!: string;

    /**
    * The name of the moderator.
    */
    @Column({
        type: DataType.STRING(40),
    })
    moderatorName!: string;

    /**
    * The display name of the moderator.
    */
    @Column({
        type: DataType.STRING(40),
    })
    moderatorDisplayName!: string;

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
    * The ID of the user being banned/unbanned.
    */
    @Column({
        type: DataType.STRING(20),
    })
    userId!: string;

    /**
    * The name of the user being banned/unbanned.
    */
    @Column({
        type: DataType.STRING(40),
    })
    userName!: string;

    /**
    * The display name of the user being banned/unbanned.
    */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName!: string;
}
