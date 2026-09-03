import { Column, DataType, Table, Model } from 'sequelize-typescript';

const COMMAND_VARIANT_UNIQUE_INDEX = 'commandName-variant';

@Table({
    tableName: 'CommandResponse',
    paranoid: true,
})
export default class CommandResponse extends Model {
    @Column({
        allowNull: false,
        type: DataType.STRING(32),
        unique: COMMAND_VARIANT_UNIQUE_INDEX,
    })
    commandName!: string;

    @Column({
        allowNull: false,
        defaultValue: '',
        type: DataType.STRING(32),
        unique: 'commandName-variant',
    })
    variant!: string;

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
