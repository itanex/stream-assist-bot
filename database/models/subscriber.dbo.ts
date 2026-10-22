import { Model, Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import SubscriptionGiftUserDbo from './subscription-gift-user.dbo.js';
import SubscriptionType from './subscription-type.js';

@Table({
    tableName: 'subscriber',
    paranoid: true,
})
export default class SubscriberDbo extends Model {
    @Column({
        type: DataType.STRING(40),
    })
    subscriber!: string;

    @Column({
        type: DataType.STRING(20),
    })
    type!: SubscriptionType;

    @Column({
        type: DataType.INTEGER,
    })
    streak!: number;

    @Column({
        type: DataType.INTEGER,
    })
    months!: number;

    @Column({
        type: DataType.BOOLEAN,
    })
    isPrime!: boolean;

    @Column({
        type: DataType.STRING(40),
    })
    plan!: string;

    @Column({
        type: DataType.STRING(40),
    })
    planName!: string;

    @Column({
        type: DataType.DATE,
    })
    time?: string;

    @ForeignKey(() => SubscriptionGiftUserDbo)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    giftUserId!: number;

    @BelongsTo(() => SubscriptionGiftUserDbo)
    gift!: SubscriptionGiftUserDbo;
}
