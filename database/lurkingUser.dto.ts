import { Model, Table, Column, DataType } from 'sequelize-typescript';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

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
}
