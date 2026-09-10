import { Column, DataType, Table, Model, HasMany } from 'sequelize-typescript';
import CommandResponseTextDbo from './command-response-text.dbo.js';

const COMMAND_VARIANT_UNIQUE_INDEX = 'commandName-variant';

@Table({
    tableName: 'CommandResponse',
    paranoid: true,
})
export default class CommandResponseDbo extends Model {
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

    @HasMany(() => CommandResponseTextDbo, {
        foreignKey: 'commandResponseId',
        as: 'texts',
    })
    texts!: CommandResponseTextDbo[];
}
