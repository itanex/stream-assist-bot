import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'raiders',
    paranoid: true,
})
export default class Raiders extends Model {
    @Column({
        type: DataType.STRING(40),
        field: 'raider',
    })
    raider?: string;

    @Column({
        type: DataType.DATE,
        field: 'time',
    })
    time?: string;

    @Column({
        type: DataType.INTEGER,
        field: 'viewerCount',
    })
    viewerCount?: number;

    /**
     * Gets the last raid record from the database
     * @returns the raider record of the last raid
     */
    static async getLastRaid(): Promise<Raiders> {
        return this
            .findOne({
                order: [['time', 'DESC']],
            });
    }
}
