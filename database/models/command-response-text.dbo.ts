import { col, fn } from 'sequelize';
import { Table, Model, ForeignKey, Column, DataType, BelongsTo } from 'sequelize-typescript';
import CommandResponseDbo from './command-response.dbo.js';

const COMMAND_TEXT_UNIQUE_INDEX = 'commandResponseId-text';

@Table({
    tableName: 'CommandResponseText',
    paranoid: true,
    indexes: [{
        name: COMMAND_TEXT_UNIQUE_INDEX,
        unique: true,
        fields: [
            'commandResponseId',
            fn('lower', col('text')),
        ],
    }],
})
export default class CommandResponseTextDbo extends Model {
    @ForeignKey(() => CommandResponseDbo)
    @Column({
        allowNull: false,
        type: DataType.INTEGER,
    })
    commandResponseId!: number;

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

    @Column({
        allowNull: false,
        type: DataType.DECIMAL,
        defaultValue: 1,
        validate: {
            isDecimal: true,
            min: 0,
            max: 99,
        },
    })
    weight!: number;

    @Column({
        allowNull: true,
        type: DataType.UUID,
    })
    deletionId!: string | null;
}
