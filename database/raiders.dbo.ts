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
    viewerCount?: Number;
}
