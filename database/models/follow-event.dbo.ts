import { EventSubChannelFollowEvent } from '@twurple/eventsub-base';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'FollowEvent',
    paranoid: true,
})
export default class FollowEvent extends Model {
    /**
     * The date when the user followed.
     */
    @Column({
        type: DataType.DATE,
    })
    followDate: Date;

    /**
     * The ID of the broadcaster.
     */
    @Column({
        type: DataType.STRING(20),
    })
    broadcasterId: string;

    /**
     * The name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterName: string;

    /**
     * The display name of the broadcaster.
     */
    @Column({
        type: DataType.STRING(40),
    })
    broadcasterDisplayName: string;

    /**
     * The ID of the following user.
     */
    @Column({
        type: DataType.STRING(20),
    })
    userId: string;

    /**
     * The name of the following user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userName: string;

    /**
     * The display name of the following user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName: string;

    /**
     * Records the event of a user following the specific channel (broadcaster)
     * @param event Follow Event
     * @returns Follow Event Record
     */
    static async follow(event: EventSubChannelFollowEvent): Promise<FollowEvent> {
        const record: Partial<FollowEvent> = {
            followDate: event.followDate,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return this
            .create(record);
    }
}
