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
        const rows = await sequelize.query<{ command_name: string, variant: string, text: string | null }>(
            `SELECT r.command_name, r.variant, t.text
             FROM command_response r
             LEFT JOIN command_response_text t
                 ON t.command_response_id = r.id AND t.deleted_at IS NULL
             WHERE r.deleted_at IS NULL`,
            { type: QueryTypes.SELECT },
        );

        const actual = new Map<string, Set<string>>();

        rows.forEach(x => {
            const key = `${x.command_name}.${x.variant}`;
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
        let missingTexts = 0;

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
                .forEach(text => {
                    missingTexts += 1;
                    logger.warn(`== missing text: ${label}: ${text}`);
                });
        });

        const summary = `${database}: ${pairs.length - failed}/${pairs.length} seed pairs present with text, ${missingTexts} missing texts`;

        if (failed > 0) {
            logger.error(`== FAIL ${summary}`);
            process.exitCode = 1;
        } else {
            logger.info(`== PASS ${summary}`);
        }
    } finally {
        await sequelize.close();
    }
}

main().catch(error => {
    logger.error('== FAIL check-responses could not complete', error);
    process.exitCode = 1;
});
