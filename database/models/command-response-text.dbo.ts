import { col, fn } from 'sequelize';
import { Table, Model, ForeignKey, Column, DataType, BelongsTo } from 'sequelize-typescript';
import CommandResponseDbo from './command-response.dbo.js';

const COMMAND_TEXT_UNIQUE_INDEX = 'command_response_text_command_response_id_text_idx';

@Table({
    tableName: 'command_response_text',
    paranoid: true,
    indexes: [{
        name: COMMAND_TEXT_UNIQUE_INDEX,
        unique: true,
        fields: [
            'command_response_id',
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
                args: [2, 400],
                msg: 'command text must be 2-400 characters',
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
