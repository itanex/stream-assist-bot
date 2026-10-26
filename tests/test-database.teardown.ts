import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/** Set by globalSetup, which runs in the same context */
const shared = globalThis as typeof globalThis & { testDatabaseContainer?: StartedPostgreSqlContainer };

/**
 * Jest globalTeardown: stops the container started in globalSetup.
 */
export default async function teardown(): Promise<void> {
    await shared.testDatabaseContainer?.stop();
}
