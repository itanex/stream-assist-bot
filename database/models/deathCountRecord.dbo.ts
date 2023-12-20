import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'DeathCounts',
    paranoid: true,
})
export default class DeathCounts extends Model {
    @Column({
        type: DataType.INTEGER,
        field: 'deathCount',
    })
    deathCount: number;

    @Column({
        type: DataType.STRING(80),
        field: 'game',
    })
    game: string;

    @Column({
        type: DataType.STRING(80),
        field: 'gameId',
    })
    gameId: string;

    @Column({
        type: DataType.STRING(80),
        field: 'streamId',
    })
    streamId: string;
}
