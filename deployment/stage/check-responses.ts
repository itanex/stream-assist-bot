/**
 * Verifies a stage database holds the baseline command response seed data:
 * every command/variant pair in the seed migration, with its texts. Queries the
 * database directly; no bot code is loaded.
 *
 * Usage: bash deployment/stage/stage.sh check-responses [db]
 *   db: stream-assist-bot-stage (default, restored copy) or stream-assist-bot-stage-fresh
 *
 * Missing pairs, or pairs with no active text, fail the check. Missing texts are
 * reported only: on a restored copy, texts may have been edited or removed in chat.
 *
 * Connection values are hard-coded to stage (must match stage.sh and
 * compose.stage.yaml) so no environment variable or .env file can redirect it.
 */
import { createRequire } from 'node:module';
import { QueryTypes, Sequelize } from 'sequelize';
import winston from 'winston';

type SeedData = Record<string, Record<string, string[]>>;

// Plain message lines, as console output; errors and warnings go to stderr
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.printf(({ message, stack }) => (stack ? `${message}\n${stack}` : `${message}`)),
    ),
    transports: [new winston.transports.Console({ stderrLevels: ['error', 'warn'] })],
});

const stageDatabases = ['stream-assist-bot-stage', 'stream-assist-bot-stage-fresh'];

const { SEED } = createRequire(import.meta.url)('../../database/migrations/20261014115000-baseline-seed-data.js') as { SEED: SeedData };

async function main(): Promise<void> {
    const database = process.argv[2] ?? stageDatabases[0];

    if (!stageDatabases.includes(database)) {
        throw new Error(`'${database}' is not a stage database (${stageDatabases.join(', ')})`);
    }

    const sequelize = new Sequelize({
        dialect: 'postgres',
        database,
        username: 'postgres',
        password: 'stage',
        host: 'localhost',
        port: 6433,
        logging: false,
    });

    try {
        const rows = await sequelize.query<{ commandName: string, variant: string, text: string | null }>(
            `SELECT r."commandName", r."variant", t."text"
             FROM "CommandResponse" r
             LEFT JOIN "CommandResponseText" t
                 ON t."commandResponseId" = r."id" AND t."deletedAt" IS NULL
             WHERE r."deletedAt" IS NULL`,
            { type: QueryTypes.SELECT },
        );

        const actual = new Map<string, Set<string>>();

        rows.forEach(x => {
            const key = `${x.commandName}.${x.variant}`;
            const texts = actual.get(key) ?? new Set<string>();

            if (x.text !== null) {
                texts.add(x.text);
            }

            actual.set(key, texts);
        });

        const pairs = Object
            .entries(SEED)
            .flatMap(([commandName, variants]) => Object
                .entries(variants)
                .map(([variant, texts]) => ({ commandName, variant, texts })));

        let failed = 0;

        pairs.forEach(({ commandName, variant, texts }) => {
            const label = `${commandName}.${variant || '(default)'}`;
            const found = actual.get(`${commandName}.${variant}`);

            if (!found || found.size === 0) {
                failed += 1;
                logger.error(`== missing pair: ${label}`);
                return;
            }

            texts
                .filter(text => !found.has(text))
                .forEach(text => logger.warn(`== missing text: ${label}: ${text}`));
        });

        logger.info(`== ${database}: ${pairs.length - failed}/${pairs.length} seed pairs present with text`);

        if (failed > 0) {
            process.exitCode = 1;
        }
    } finally {
        await sequelize.close();
    }
}

main().catch(error => {
    logger.error('check-responses failed', error);
    process.exitCode = 1;
});
