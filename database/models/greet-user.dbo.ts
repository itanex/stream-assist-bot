import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'greetedUsers',
    paranoid: true,
})
export default class GreetUser extends Model {
    @Column({
        type: DataType.STRING(40),
        field: 'displayName',
        allowNull: false,
    })
    displayName!: string;

    @Column({
        type: DataType.STRING(20),
        field: 'userId',
        allowNull: false,
    })
    userId!: string;

    @Column({
        type: DataType.STRING(80),
        field: 'streamId',
        allowNull: false,
    })
    streamId!: string;

    @Column({
        type: DataType.DATE,
        field: 'greetedAt',
        allowNull: false,
    })
    greetedAt!: Date;
}
