/**
 * Exercises command response startup validation against a stage database,
 * through the production console filter. Builds the bot's Database,
 * CommandResponseRepository and CommandResponseService directly; no DI
 * container and no Twitch clients are loaded.
 *
 * Usage: bash deployment/stage/stage.sh check-validation [db]
 *   db: stream-assist-bot-stage (default, restored copy) or stream-assist-bot-stage-fresh
 *
 * stage.sh sets NODE_ENV=production; the bot logger reads it when its module
 * loads, so it cannot be set from inside this script.
 *
 * Validates every command in the baseline seed migration plus one name with no
 * entries, then logs an untagged warning and an error through the bot logger.
 * Expected bot logger output on stdout: one stdout-tagged warning for the
 * missing name, then the probe error. The probe warning must not appear. Any
 * other validation warning means the database and the baseline disagree; on a
 * restored copy that may be a text removed in chat. The bot logger also writes
 * to ./logs.
 *
 * Connection values are hard-coded to stage (must match stage.sh and
 * compose.stage.yaml) so no environment variable or .env file can redirect it.
 */
import 'reflect-metadata';
import { createRequire } from 'node:module';
import winston from 'winston';
import logger from '../../logger/logger.js';
import Database from '../../database/database.js';
import { CommandResponseRepository } from '../../bot/repositories/index.js';
import CommandResponseService from '../../bot/services/command-response.service.js';

type SeedData = Record<string, Record<string, string[]>>;

// Plain message lines for script output, kept apart from the bot logger under test
const scriptLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.printf(({ message, stack }) => (stack ? `${message}\n${stack}` : `${message}`)),
    ),
    transports: [new winston.transports.Console({ stderrLevels: ['error', 'warn'] })],
});

const stageDatabases = ['stream-assist-bot-stage', 'stream-assist-bot-stage-fresh'];

const missingName = 'stage-check-missing';

const { SEED } = createRequire(import.meta.url)('../../database/migrations/20261014115000-baseline-seed-data.js') as { SEED: SeedData };

async function main(): Promise<void> {
    const databaseName = process.argv[2] ?? stageDatabases[0];

    if (!stageDatabases.includes(databaseName)) {
        throw new Error(`'${databaseName}' is not a stage database (${stageDatabases.join(', ')})`);
    }

    if (process.env.NODE_ENV !== 'production') {
        throw new Error('NODE_ENV is not production; run through stage.sh check-validation');
    }

    const database = new Database({
        database: databaseName,
        username: 'postgres',
        password: 'stage',
        host: 'localhost',
        port: 6433,
    }, logger);

    try {
        await database.connect();

        const service = new CommandResponseService(new CommandResponseRepository(database, logger), logger);
        const commandNames = Object.keys(SEED);

        scriptLogger.info(`== validating ${commandNames.length} seed commands plus '${missingName}' on ${databaseName}`);
        scriptLogger.info(`== expected below: one warning for '${missingName}', then the probe error; no probe warning`);

        await service.initialize([...commandNames, missingName]);

        logger.warn('check-validation probe: untagged warning, must not appear on stdout');
        logger.error('check-validation probe: error, must appear on stdout');
    } finally {
        await database.disconnect();
    }
}

main()
    .catch(error => {
        scriptLogger.error('== FAIL check-validation could not complete', error);
        process.exitCode = 1;
    })
    // flush and close the bot logger's file transports so the process can exit
    .finally(() => logger.end());
