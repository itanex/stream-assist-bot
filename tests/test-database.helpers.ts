import { randomUUID } from 'node:crypto';
import { QueryTypes, Sequelize } from 'sequelize';
import winston from 'winston';
import type Database from '../database/database.js';
import type { IDatabaseConfiguration } from '../database/database.js';

/** Database every spec database is cloned from */
const templateDatabase = 'test_template';

/** Advisory lock key that serializes template builds and clones */
const templateLockKey = 184;

type ServerConfiguration = Omit<IDatabaseConfiguration, 'database'>;

/**
 * Builds every model's table in a test database. Stands in for the
 * migrations, which deliver schema outside of tests.
 */
export default async function syncSchema(database: Database): Promise<void> {
    // sync logging has no diagnostic value
    await database.db.sync({ logging: false });
}

/** Reads the connection details globalSetup (test-database.setup.ts) publishes */
function readServerConfiguration(): ServerConfiguration {
    const {
        TEST_POSTGRES_HOST: host,
        TEST_POSTGRES_PORT: port,
        TEST_POSTGRES_USER: username,
        TEST_POSTGRES_PASSWORD: password,
    } = process.env;

    if (!host || !port || !username || !password) {
        throw new Error('Test database server is not configured: TEST_POSTGRES_* are not set. Run specs through jest.config.cjs, which starts the server in globalSetup.');
    }

    return {
        host,
        port: Number(port),
        username,
        password,
    };
}

/** Runs an action on a connection to the server's `postgres` database */
async function withAdminConnection<T>(action: (connection: Sequelize) => Promise<T>): Promise<T> {
    const connection = new Sequelize({
        ...readServerConfiguration(),
        database: 'postgres',
        dialect: 'postgres',
        logging: false,
        // one connection, so an advisory lock and the statements it guards share a session
        pool: { max: 1, min: 0 },
    });

    try {
        return await action(connection);
    } finally {
        await connection.close();
    }
}

/**
 * Creates the template database and builds its schema, unless an
 * earlier spec in this run already has. Callers hold the template lock.
 */
async function ensureTemplateDatabase(connection: Sequelize): Promise<void> {
    const existing = await connection.query('SELECT 1 FROM pg_database WHERE datname = :name', {
        replacements: { name: templateDatabase },
        type: QueryTypes.SELECT,
    });

    if (existing.length > 0) {
        return;
    }

    // loaded here so specs importing these helpers do not load the models
    const { default: DatabaseClass } = await import('../database/database.js');

    await connection.query(`CREATE DATABASE ${templateDatabase}`);

    const database = new DatabaseClass(
        {
            ...readServerConfiguration(),
            database: templateDatabase,
        },
        winston.createLogger({ silent: true }),
    );

    try {
        await syncSchema(database);
    } catch (error) {
        // a partial template would be cloned by every later spec
        await database.disconnect();
        await connection.query(`DROP DATABASE IF EXISTS ${templateDatabase} WITH (FORCE)`);
        throw error;
    }

    // the template cannot be cloned while a session is connected to it
    await database.disconnect();
}

/** Creates a database for one spec, cloned from the template */
export async function createTestDatabase(): Promise<IDatabaseConfiguration> {
    const database = `test_${randomUUID().replaceAll('-', '')}`;

    await withAdminConnection(async connection => {
        const lock = { replacements: { key: templateLockKey } };

        await connection.query('SELECT pg_advisory_lock(:key)', lock);

        try {
            await ensureTemplateDatabase(connection);
            await connection.query(`CREATE DATABASE ${database} TEMPLATE ${templateDatabase}`);
        } finally {
            await connection.query('SELECT pg_advisory_unlock(:key)', lock);
        }
    });

    return {
        ...readServerConfiguration(),
        database,
    };
}

/** Drops a spec database, closing any connections left open */
export async function dropTestDatabase(configuration: IDatabaseConfiguration): Promise<void> {
    await withAdminConnection(connection => connection.query(`DROP DATABASE IF EXISTS ${configuration.database} WITH (FORCE)`));
}
