import { Model, Column, DataType, HasMany, Table } from 'sequelize-typescript';
import SubscriberDbo from './subscriber.dbo.js';

@Table({
    tableName: 'subscription_gift_user',
    paranoid: true,
})
export default class SubscriptionGiftUserDbo extends Model {
    @Column({
        type: DataType.STRING(40),
    })
    gifter!: string;

    @Column({
        type: DataType.INTEGER,
    })
    giftCount!: number;

    @HasMany(() => SubscriberDbo)
    subscribers!: SubscriberDbo[];
}
