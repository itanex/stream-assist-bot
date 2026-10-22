import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'greeted_user',
    paranoid: true,
})
export default class GreetedUserDbo extends Model {
    @Column({
        type: DataType.STRING(40),
        allowNull: false,
    })
    displayName!: string;

    @Column({
        type: DataType.STRING(20),
        allowNull: false,
    })
    userId!: string;

    @Column({
        type: DataType.STRING(80),
        allowNull: false,
    })
    streamId!: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    greetedAt!: Date;
}
