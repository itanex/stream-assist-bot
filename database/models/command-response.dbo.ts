import { Column, DataType, Table, Model, HasMany } from 'sequelize-typescript';
import CommandResponseText from './command-response-text.dbo.js';

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
        unique: COMMAND_VARIANT_UNIQUE_INDEX,
    })
    variant!: string;

    @HasMany(() => CommandResponseText)
    texts!: CommandResponseText[];
}
