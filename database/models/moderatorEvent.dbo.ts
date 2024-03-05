import { EventSubChannelModeratorEvent } from '@twurple/eventsub-base';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'ModeratorEvent',
    paranoid: true,
})
export default class ModeratorEvent extends Model {
    @Column({
        type: DataType.DATE,
    })
    addDate: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    removeDate: Date;

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
     * The ID of the user target of the moderator event.
     */
    @Column({
        type: DataType.STRING(20),
    })
    userId: string;

    /**
     * The name of the user target of the moderator event.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userName: string;

    /**
     * The display name of the user target of the moderator event.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName: string;

    /**
     * Maps add moderator event to DBO and saves a new event in the database
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    static async addUserAsMod(event: EventSubChannelModeratorEvent): Promise<ModeratorEvent> {
        const record: Partial<ModeratorEvent> = {
            addDate: new Date(),
            removeDate: null,
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

    /**
     * Updates moderator event in DB with a remove date
     * @param event Moderator Event
     * @returns Moderator Event Record
     */
    static async removeUserAsMod(event: EventSubChannelModeratorEvent): Promise<[number, ModeratorEvent[]]> {
        const record: Partial<ModeratorEvent> = {
            addDate: new Date(),
            removeDate: null,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
        };

        return this
            .update(
                { removeDate: new Date() },
                {
                    where: {
                        removeDate: null,
                        broadcasterId: event.broadcasterId,
                        userId: event.userId,
                    },
                    returning: true,
                },
            );
    }
}
