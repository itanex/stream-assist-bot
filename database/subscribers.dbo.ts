import { Model, Table, Column, DataType, ForeignKey } from 'sequelize-typescript';
import SubsciptionGiftUsers from './subsciptionGiftUsers.dbo';
import { SubscriptionType } from './subcriptionType';

@Table({
    tableName: 'subscribers',
    paranoid: true,
})
export default class Subscribers extends Model {
    @Column({
        type: DataType.STRING(40),
        field: 'subscriber',
    })
    subscriber: string;

    @Column({
        type: DataType.STRING(20),
        field: 'type',
    })
    type: SubscriptionType;

    @Column({
        type: DataType.INTEGER,
        field: 'streak',
    })
    streak: number;

    @Column({
        type: DataType.INTEGER,
        field: 'months',
    })
    months: number;

    @Column({
        type: DataType.BOOLEAN,
        field: 'isPrime',
    })
    isPrime: boolean;

    @Column({
        type: DataType.STRING(40),
        field: 'plan',
    })
    plan: string;

    @Column({
        type: DataType.STRING(40),
        field: 'planName',
    })
    planName: string;

    @Column({
        type: DataType.DATE,
        field: 'time',
    })
    time?: string;

    @ForeignKey(() => SubsciptionGiftUsers)
    @Column({ allowNull: true })
    giftUserId: number;
}
