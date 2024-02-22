import { EventSubChannelRedemptionAddEvent } from '@twurple/eventsub-base';
import { Model, Table, Column, DataType } from 'sequelize-typescript';

@Table({
    // consider placing this in a schema to
    // cover all Event Sub data
    // schema: 'EventSubData',
    tableName: 'ChannelPointRedeem',
    paranoid: true,
})
export default class ChannelPointRedeem extends Model {
    /**
     * The ID of the redemption.
     */
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    eventId: string;

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
     * The ID of the user.
     */
    @Column({
        type: DataType.STRING(20),
    })
    userId: string;

    /**
     * The name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userName: string;

    /**
     * The display name of the user.
     */
    @Column({
        type: DataType.STRING(40),
    })
    userDisplayName: string;

    /**
     * The input text given by the user.
     *
     * If there is no input to be given, this is an empty string.
     */
    @Column({
        type: DataType.STRING(255),
    })
    input: string;

    /**
     * The status of the redemption.
     */
    @Column({
        type: DataType.STRING(20),
    })
    status: string;

    /**
     * The ID of the reward that was redeemed.
     */
    @Column({
        type: DataType.UUID,
    })
    rewardId: string;

    /**
     * The title of the reward that was redeemed.
     */
    @Column({
        type: DataType.STRING(255),
    })
    rewardTitle: string;

    /**
     * The cost of the reward that was redeemed.
     */
    @Column({
        type: DataType.INTEGER,
    })
    rewardCost: number;

    /**
     * The description of the reward that was redeemed.
     */
    @Column({
        type: DataType.STRING(255),
    })
    rewardPrompt: string;

    /**
     * The time when the user redeemed the reward.
     */
    @Column({
        type: DataType.DATE,
    })
    redemptionDate: Date;

    /**
     * Saves the event record into the database as per the mapping results required
     * @param event The event record to save information from into the database
     * @returns The stored event record
     */
    static async saveRedeemEvent(event: EventSubChannelRedemptionAddEvent): Promise<ChannelPointRedeem> {
        const record: Partial<ChannelPointRedeem> = {
            eventId: event.id,
            broadcasterId: event.broadcasterId,
            broadcasterName: event.broadcasterName,
            broadcasterDisplayName: event.broadcasterDisplayName,
            userId: event.userId,
            userName: event.userName,
            userDisplayName: event.userDisplayName,
            input: event.input,
            status: event.status,
            rewardId: event.rewardId,
            rewardTitle: event.rewardTitle,
            rewardCost: event.rewardCost,
            rewardPrompt: event.rewardPrompt,
            redemptionDate: event.redemptionDate,
        };

        return ChannelPointRedeem
            .create(record);
    }
}

class ChannelReward {
    id: string;
    title: string;
    cost: number;
    prompt: string;
}
