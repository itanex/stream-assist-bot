/**
 * Runs the app's sync() and seed() against the empty stage database, without
 * starting the bot, then reports what they produced.
 *
 * Usage: bash deployment/stage/stage.sh seed-fresh
 *
 * Connection values are hard-coded to stage (must match stage.sh and
 * compose.stage.yaml) so no environment variable or .env file can redirect it.
 */
import 'reflect-metadata';
import winston from 'winston';
import { QueryTypes } from 'sequelize';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import CommandResponseRepository from '../../bot/repositories/command-response.repository.js';
import { defaultResponses } from '../../bot/utilities/default-responses.js';

const stageConfiguration: IDatabaseConfiguration = {
    database: 'stream-assist-bot-stage-fresh',
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
        await database.initialize();

        const repository = new CommandResponseRepository(database, logger);
        await repository.seed(defaultResponses);

        const [counts] = await database.db.query<{ responses: string, texts: string }>(
            `SELECT (SELECT count(*) FROM "CommandResponse") AS responses,
                    (SELECT count(*) FROM "CommandResponseText") AS texts`,
            { type: QueryTypes.SELECT },
        );

        const foreignKeys = await database.db.query<{ name: string, definition: string }>(
            `SELECT conname AS name, pg_get_constraintdef(oid) AS definition
             FROM pg_constraint
             WHERE conrelid = '"CommandResponseText"'::regclass AND contype = 'f'`,
            { type: QueryTypes.SELECT },
        );

        logger.info(`== seed result: ${counts.responses} CommandResponse, ${counts.texts} CommandResponseText (0 means seed() failed; see error above)`);
        foreignKeys.forEach(x => logger.info(`== sync() foreign key ${x.name}: ${x.definition}`));
    } finally {
        await database.disconnect();
    }
}

main().catch(error => {
    logger.error('seed-fresh failed', error);
    process.exitCode = 1;
});
