import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

/** Shared with globalTeardown, which runs in the same context */
const shared = globalThis as typeof globalThis & { testDatabaseContainer?: StartedPostgreSqlContainer };

/**
 * Jest globalSetup: starts the one Postgres container shared by every
 * database-backed spec. Imports no project modules: globalSetup is loaded
 * outside the Jest runtime, so `.js` specifiers do not resolve to `.ts`.
 */
export default async function setup(): Promise<void> {
    let container: StartedPostgreSqlContainer;

    try {
        container = await new PostgreSqlContainer('postgres:17.2')
            // durability is irrelevant for disposable test data
            .withCommand([
                'postgres',
                '-c', 'fsync=off',
                '-c', 'synchronous_commit=off',
                '-c', 'full_page_writes=off',
            ])
            .start();
    } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('401') || message.includes('authentication required')) {
            throw new Error([
                'Docker registry authentication failed while pulling the postgres image.',
                'Local Docker Hub credentials are stale: run `docker login`, then rerun.',
                `Original error: ${message}`,
            ].join(' '));
        }

        throw error;
    }

    shared.testDatabaseContainer = container;

    // test workers inherit this environment; read by test-database.helpers.ts
    process.env.TEST_POSTGRES_HOST = container.getHost();
    process.env.TEST_POSTGRES_PORT = String(container.getPort());
    process.env.TEST_POSTGRES_USER = container.getUsername();
    process.env.TEST_POSTGRES_PASSWORD = container.getPassword();
}
