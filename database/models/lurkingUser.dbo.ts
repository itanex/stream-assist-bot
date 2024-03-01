import { Model, Table, Column, DataType } from 'sequelize-typescript';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { ChatUser } from '@twurple/chat';

dayjs.extend(duration);

@Table({
    tableName: 'lurkingUsers',
    paranoid: true,
})
export default class LurkingUsers extends Model {
    @Column({
        type: DataType.STRING(40),
        field: 'displayName',
    })
    displayName: string;

    @Column({
        type: DataType.STRING(20),
        field: 'userId',
    })
    userId: string;

    @Column({
        type: DataType.DATE,
        field: 'startTime',
    })
    startTime: Date;

    @Column({
        type: DataType.DATE,
        field: 'endTime',
        allowNull: true,
    })
    endTime: Date;

    get lurking(): boolean {
        return !!this.endTime;
    }

    public duration(): duration.Duration {
        if (this.endTime) {
            return dayjs.duration(dayjs(this.startTime).diff(dayjs(this.endTime)));
        }

        return dayjs.duration(dayjs(this.startTime).diff(dayjs()));
    }

    static async setUserToLurk(user: ChatUser): Promise<[LurkingUsers, boolean]> {
        return this
            .findOrCreate({
                where: {
                    userId: user.userId,
                    endTime: null,
                },
                order: [['createdAt', 'DESC']],
                defaults: {
                    displayName: user.displayName,
                    userId: user.userId,
                    startTime: new Date(),
                },
            });
    }

    static async setUserToUnlurk(user: ChatUser): Promise<LurkingUsers> {
        return this
            .findOne({
                where: {
                    userId: user.userId,
                    endTime: null,
                },
                order: [['createdAt', 'DESC']],
            });
    }

    static async getAllLurkingUsers(): Promise<LurkingUsers[]> {
        return this
            .findAll({
                where: { endTime: null },
                order: [['createdAt', 'DESC']],
            });
    }

    static async setAllUsersToUnlurk(endTime?: Date): Promise<[number, LurkingUsers[]]> {
        return this
            .update(
                { endTime: endTime || new Date() },
                {
                    where: { endTime: null },
                    returning: true,
                },
            );
    }
}
