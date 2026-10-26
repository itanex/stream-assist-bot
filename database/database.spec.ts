import 'reflect-metadata';
import { jest } from '@jest/globals';
import Database, { IDatabaseConfiguration } from './database.js';
import {
    createTestDatabase,
    dropTestDatabase,
    mockLogger,
} from '../tests/index.js';

// ORDER MATTERS: constructing a Database rebinds every model class
// (static sequelize ref) to the newest instance. Any test that touches
// models through an earlier instance must run before this
// point. Do not move this block above the model-dependent tests.

describe('Database (postgres)', () => {
    let databaseConfiguration: IDatabaseConfiguration;

    beforeAll(async () => {
        databaseConfiguration = await createTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase(databaseConfiguration);
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('Valid Database object', () => {
        let database: Database;

        beforeAll(() => {
            database = new Database(databaseConfiguration, mockLogger);
        });

        afterAll(async () => {
            await database.disconnect();
        });

        describe('Construction', () => {
            it('creates a valid Database Object', () => {
                // Arrange & Act - beforeAll()
                // Assert
                expect(database.db).toBeDefined();
            });
        });

        describe('validate()', () => {
            it('should validate the database connection is established', async () => {
                // Arrange - beforeAll()
                // Act & Assert - direct assertion
                await expect(database.validate()).resolves.not.toThrow();
            }, 30_000);
        });

        describe('connect()', () => {
            it('connects and logs connection message', async () => {
                // Arrange - beforeAll()
                // Act
                await database.connect();

                // Assert
                expect(mockLogger.info).toHaveBeenCalledWith('DB Connection has been established successfully.');
            }, 30_000);
        });

        describe('initialize()', () => {
            it('connects without syncing the database', async () => {
                // Arrange
                const syncSpy = jest.spyOn(database.db, 'sync');

                // Act
                await database.initialize();

                // Assert
                expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
                expect(syncSpy).not.toHaveBeenCalled();

                syncSpy.mockRestore();
            }, 30_000);
        });

        describe('disconnect()', () => {
            it('successfully disconnects from the database', async () => {
                // Arrange
                const db = new Database(databaseConfiguration, mockLogger);
                await db.validate();

                // Act
                await db.disconnect();

                // Assert
                await expect(db.validate()).rejects.toThrow();
            });
        });
    });

    describe('Invalid Database object', () => {
        /** database configured with bad password */
        let badDatabase: Database;

        beforeAll(() => {
            badDatabase = new Database({
                ...databaseConfiguration,
                password: 'wrong_password',
            }, mockLogger);
        });

        afterAll(async () => {
            await badDatabase.disconnect();
        });

        describe('validate()', () => {
            it('should validate the database connection is NOT established', async () => {
                // Arrange - beforeAll()
                // Act & Assert - direct assertion
                await expect(badDatabase.validate()).rejects.toThrow();
            }, 30_000);
        });

        describe('connect()', () => {
            it('fails to connect and logs connection error', async () => {
                // Arrange - beforeAll()
                // Act & Assert
                await expect(badDatabase.connect()).rejects.toThrow();
                expect(mockLogger.info).not.toHaveBeenCalled();
                expect(mockLogger.error).toHaveBeenCalledWith('**Unable to connect to the database**:', expect.anything());
            }, 30_000);
        });
    });
});
