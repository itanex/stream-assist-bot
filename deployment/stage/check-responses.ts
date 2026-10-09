/**
 * Loads CommandResponseService against the migrated stage copy, in the app's
 * startup order, and confirms every command/variant resolves to text. The bot
 * is never started.
 *
 * Usage: bash deployment/stage/stage.sh check-responses
 *
 * Connection values are hard-coded to stage (must match stage.sh and
 * compose.stage.yaml) so no environment variable or .env file can redirect it.
 */
import 'reflect-metadata';
import winston from 'winston';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import CommandResponseRepository from '../../bot/repositories/command-response.repository.js';
import CommandResponseService from '../../bot/services/command-response.service.js';
import { CommandFamilies, defaultResponses } from '../../bot/utilities/default-responses.js';

const stageConfiguration: IDatabaseConfiguration = {
    database: 'stream-assist-bot-stage',
    username: 'postgres',
    password: 'stage',
    host: 'localhost',
    port: 6433,
};

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.simple(),
    ),
    transports: [new winston.transports.Console()],
});

async function main(): Promise<void> {
    const database = new Database(stageConfiguration, logger);

    try {
        // app startup order: Database.initialize() (sync), then the service cache
        await database.initialize();

        const service = new CommandResponseService(new CommandResponseRepository(database, logger), logger);
        await service.initialize();

        const pairs = [
            ...Object
                .entries(defaultResponses)
                .flatMap(([commandName, variants]) => Object
                    .keys(variants)
                    .map(variant => ({ commandName, variant }))),
            ...Object
                .keys(CommandFamilies)
                .flatMap(commandName => service
                    .getCommandVariants(commandName)
                    .map(variant => ({ commandName, variant }))),
        ];

        const missing = pairs.filter(x => !service.getCommandResponse(x.commandName, x.variant));

        missing.forEach(x => logger.error(`== missing text: ${x.commandName}.${x.variant || '(default)'}`));
        logger.info(`== ${pairs.length - missing.length}/${pairs.length} command/variant pairs resolve to text`);

        if (missing.length > 0) {
            process.exitCode = 1;
        }
    } finally {
        await database.disconnect();
    }
}

main().catch(error => {
    logger.error('check-responses failed', error);
    process.exitCode = 1;
});
