import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'raiders',
    paranoid: true,
})
export default class Raiders extends Model {
    @Column({
        type: DataType.STRING(40),
        allowNull: false,
        field: 'raider',
    })
    raider!: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'time',
    })
    time!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'viewerCount',
    })
    viewerCount!: number;
}
