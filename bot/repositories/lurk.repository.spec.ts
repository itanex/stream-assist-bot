import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import LurkRepository from './lurk.repository.js';
import {
    createTestDatabase,
    dropTestDatabase,
    mockLogger,
} from '../../tests/index.js';
import { LurkingUserDbo } from '../../database/index.js';

describe('Lurk Repository (postgres)', () => {
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: LurkRepository;

    beforeAll(async () => {
        databaseConfiguration = await createTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase(databaseConfiguration);
    });

    describe('Valid Database object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.connect();
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            jest.useFakeTimers().setSystemTime(fixedDateTime);

            await LurkingUserDbo.destroy({ where: {}, force: true });
            subject = new LurkRepository(mockLogger);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('getAllLurkingUsers()', () => {
            it('should return empty collection with no seeded lurkers', async () => {
                // Arrange
                // Act
                const records = await subject.getAllLurkingUsers();

                // Assert
                expect(records.length).toBe(0);
            });
            it('should return all lurkers', async () => {
                // Arrange
                const lurkingUser = <unknown>{
                    displayName: 'TestUser',
                    userId: 'TestUserId',
                } as ChatUser;
                await subject.setUserToLurk(lurkingUser);

                // Act
                const records = await subject.getAllLurkingUsers();
                const updated = records.find(r => r.displayName === lurkingUser.displayName);

                // Assert
                expect(records.length).toBe(1);
                expect(updated?.userId).toBe(lurkingUser.userId);
                expect(updated?.startTime).toStrictEqual(expect.anything());
            });
        });
        describe('setUserToLurk()', () => {
            it('should return the user as lurking', async () => {
                // Arrange
                const lurkingUser = <unknown>{
                    displayName: 'TestUser',
                    userId: 'TestUserId',
                } as ChatUser;

                // Act
                const [record, saved] = await subject.setUserToLurk(lurkingUser);

                // Assert
                expect(saved).toBe(true);
                expect(record.displayName).toBe(lurkingUser.displayName);
                expect(record.userId).toBe(lurkingUser.userId);
                expect(record.startTime).toStrictEqual(fixedDateTime);
            });
        });
        describe('setUserToUnlurk()', () => {
            it('should return the user as unlurking', async () => {
                // Arrange
                const lurkingUser = <unknown>{
                    displayName: 'TestUser',
                    userId: 'TestUserId',
                } as ChatUser;

                // Act
                const unlurkedUser = await subject.setUserToLurk(lurkingUser)
                    .then(() => subject.setUserToUnlurk(lurkingUser));

                // Assert
                expect(unlurkedUser?.displayName).toStrictEqual(lurkingUser.displayName);
                expect(unlurkedUser?.userId).toBe(lurkingUser.userId);
                expect(unlurkedUser?.startTime).toStrictEqual(fixedDateTime);
                expect(unlurkedUser?.endTime).toStrictEqual(fixedDateTime);
            });
            it('should return null for no lurking user found', async () => {
                // Arrange
                const lurkingUser = <unknown>{
                    displayName: 'TestUser',
                    userId: 'TestUserId',
                } as ChatUser;

                // Act
                const unlurkedUser = await subject.setUserToUnlurk(lurkingUser);

                // Assert
                expect(unlurkedUser).toBe(null);
            });
        });
        describe('setAllUsersToUnlurk()', () => {
            it('should set all users still lurking to unlurk (endtime = datetime)', async () => {
                // Arrange
                const lurkingUser = <unknown>{
                    displayName: 'TestUser',
                    userId: 'TestUserId',
                } as ChatUser;

                // Act
                const [count, users] = await subject.setUserToLurk(lurkingUser)
                    .then(() => subject.setAllUsersToUnlurk());

                const unlurkedUser = users[0] ?? null;

                // Assert
                expect(count).toBe(1);
                expect(unlurkedUser?.displayName).toStrictEqual(lurkingUser.displayName);
                expect(unlurkedUser?.userId).toBe(lurkingUser.userId);
                expect(unlurkedUser?.startTime).toStrictEqual(fixedDateTime);
                expect(unlurkedUser?.endTime).toStrictEqual(fixedDateTime);
            });
        });
    });
});
