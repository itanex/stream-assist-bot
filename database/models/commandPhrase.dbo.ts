import { Column, DataType, Table, Model } from 'sequelize-typescript';
import { defaultPhrases, PhraseKey } from '../../bot/utilities/default-phrases';

@Table({
    tableName: 'CommandPhrase',
    paranoid: true,
})
export default class CommandPhrase extends Model {
    @Column({
        allowNull: false,
        type: DataType.STRING(255),
        unique: true,
    })
    commandName!: string;

    @Column({
        allowNull: false,
        type: DataType.TEXT,
        validate: {
            notEmpty: true,
            len: {
                args: [10, 400],
                msg: 'template must be 10-400 characters',
            },
        },
        set(value: string) {
            this.setDataValue('template', value?.trim());
        },
    })
    template!: string;

    static async seed(entries: Record<string, string>): Promise<void> {
        const records = Object
            .entries(entries)
            .map(([commandName, template]) => ({ commandName, template }));

        await CommandPhrase.bulkCreate(
            records,
            {
                ignoreDuplicates: true,
                validate: true,
            },
        );
    }

    /**
     * Get the command based on the provided commandName
     * @param commandName The command name to fetch
     * @returns The Command based on the provided commandName or null
     */
    static async getCommand(commandName: string): Promise<CommandPhrase | null> {
        return CommandPhrase
            .findOne({
                where: {
                    commandName,
                },
            });
    }

    /**
     * Update existing command based on the provided template
     * @param commandName The command name to update
     * @param template new template value for the Command
     * @returns boolean flag denoting if the provided command was updated
     */
    static async updateCommandTemplate(commandName: string, template: string): Promise<boolean> {
        const [count] = await CommandPhrase.update(
            { template },
            { where: { commandName } },
        );

        return count === 1;
    }
}
