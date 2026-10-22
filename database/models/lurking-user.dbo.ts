import { Model, Table, Column, DataType } from 'sequelize-typescript';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';

dayjs.extend(duration);

@Table({
    tableName: 'lurking_user',
    paranoid: true,
})
export default class LurkingUser extends Model {
    @Column({
        type: DataType.STRING(40),
    })
    displayName!: string;

    @Column({
        type: DataType.STRING(20),
    })
    userId!: string;

    @Column({
        type: DataType.DATE,
    })
    startTime!: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    endTime!: Date;

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
