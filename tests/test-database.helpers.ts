import type Database from '../database/database.js';

/**
 * Builds every model's table in a test database. Stands in for the
 * migrations, which deliver schema outside of tests.
 */
export default async function syncSchema(database: Database): Promise<void> {
    // sync logging has no diagnostic value
    await database.db.sync({ logging: false });
}
