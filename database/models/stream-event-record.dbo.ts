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
        allowNull: false,
    })
    streamId!: string;

    /**
     * The type of the stream going live.
     */
    @Column({
        type: DataType.STRING(20),
        allowNull: false,
    })
    type!: string;

    /**
     * The date and time when the stream was started.
     */
    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    startDate!: Date;

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
        allowNull: false,
    })
    broadcasterId!: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
        allowNull: false,
    })
    broadcasterName!: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
        allowNull: false,
    })
    broadcasterDisplayName!: string;
}
