import { Column, DataType, Table, Model } from 'sequelize-typescript';

const COMMAND_VARIANT_UNIQUE_INDEX = 'commandName-variant';

@Table({
    tableName: 'CommandPhrase',
    paranoid: true,
})
export default class CommandPhrase extends Model {
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
     * Get the command template based on the provided commandName
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    static async getCommandTemplate(commandName: string, variant?: string): Promise<CommandPhrase | null> {
        return CommandPhrase
            .findOne({
                where: {
                    commandName,
                    variant: variant ?? null,
                },
            });
    }

    /**
     * Get the command variants based on the provided commandName
     * @param commandName The command name to fetch
     * @param variant The command name variant to fetch
     * @returns The Command based on the provided commandName or null
     */
    static async getCommandVariants(commandName: string): Promise<CommandPhrase[]> {
        return CommandPhrase
            .findAll({
                where: {
                    commandName,
                },
            });
    }

    /**
     * Inserts the provided command with variant and template
     * @param commandName The command name to fetch
     * @param template new template value for the Command
     * @param variant The command name variant to fetch
     * @returns The created command if successful, rejected error otherwise
     */
    static async addCommandTemplate(commandName: string, template: string, variant: string = ''): Promise<CommandPhrase> {
        return CommandPhrase.create({
            commandName,
            variant,
            template,
        }, {
            isNewRecord: true,
            validate: true,
        });
    }

    /**
     * Update existing command based on the provided template
     * @param commandName The command name to update
     * @param template new template value for the Command
     * @param variant The command name variant to update
     * @returns boolean flag denoting if the provided command was updated
     */
    static async updateCommandTemplate(commandName: string, template: string, variant: string = ''): Promise<boolean> {
        const [count] = await CommandPhrase.update(
            { template },
            {
                where: {
                    commandName,
                    variant,
                },
            },
        );

        return count === 1;
    }
}
