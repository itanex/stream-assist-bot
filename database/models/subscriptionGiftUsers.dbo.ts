import { Model, Column, DataType, HasMany, Table } from 'sequelize-typescript';
import Subscribers from './subscribers.dbo';

@Table({
    tableName: 'subscriptionGiftUsers',
    paranoid: true,
})
export default class SubscriptionGiftUsers extends Model {
    @Column({
        type: DataType.STRING(40),
        field: 'gifter',
    })
    gifter: string;

    @Column({
        type: DataType.INTEGER,
        field: 'giftCount',
    })
    giftCount: number;

    @HasMany(() => Subscribers)
    subscribers: Subscribers[];
}
