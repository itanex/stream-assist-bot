import { Table, Model, ForeignKey, Column, DataType, BelongsTo } from 'sequelize-typescript';
import CommandResponse from './command-response.dbo.js';

@Table({
    tableName: 'CommandResponseText',
    paranoid: true,
})
export default class CommandResponseText extends Model {
    @ForeignKey(() => CommandResponse)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
    })
    commandResponseId!: number;

    @BelongsTo(() => CommandResponse)
    commandResponse!: CommandResponse;

    @Column({
        allowNull: false,
        type: DataType.TEXT,
        validate: {
            notEmpty: true,
            len: {
                args: [10, 400],
                msg: 'command text must be 10-400 characters',
            },
        },
        set(value: string) {
            this.setDataValue('text', value?.trim());
        },
    })
    text!: string;
}
