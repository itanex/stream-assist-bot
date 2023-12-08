import { Model, Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import SubscriptionGiftUsers from './subscriptionGiftUsers.dbo';
import SubscriptionType from './subscriptionType';

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

    @ForeignKey(() => SubscriptionGiftUsers)
    @Column({ allowNull: true })
    giftUserId: number;

    @BelongsTo(() => SubscriptionGiftUsers)
    gift: SubscriptionGiftUsers;
}
