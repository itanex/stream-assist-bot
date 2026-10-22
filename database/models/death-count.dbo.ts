import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'death_count',
    paranoid: true,
})
export default class DeathCountDbo extends Model {
    @Column({
        type: DataType.INTEGER,
    })
    deathCount!: number;

    @Column({
        type: DataType.STRING(80),
    })
    game!: string;

    @Column({
        type: DataType.STRING(80),
    })
    gameId!: string;

    @Column({
        type: DataType.STRING(80),
    })
    streamId!: string;
}
