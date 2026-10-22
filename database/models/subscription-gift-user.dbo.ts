import { Model, Column, DataType, HasMany, Table } from 'sequelize-typescript';
import Subscriber from './subscriber.dbo.js';

@Table({
    tableName: 'subscription_gift_user',
    paranoid: true,
})
export default class SubscriptionGiftUser extends Model {
    @Column({
        type: DataType.STRING(40),
    })
    gifter!: string;

    @Column({
        type: DataType.INTEGER,
    })
    giftCount!: number;

    @HasMany(() => Subscriber)
    subscribers!: Subscriber[];
}
