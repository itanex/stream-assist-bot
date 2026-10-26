import { expect, jest } from '@jest/globals';
import { HelixStream } from '@twurple/api';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import DeathCountRepository from './death-count.repository.js';
import {
    mockLogger,
    mockError,
    createTestDatabase,
    dropTestDatabase,
} from '../../tests/index.js';
import { DeathCountDbo } from '../../database/index.js';

const mockStreamData = <HelixStream>{
    id: 'TestStreamId',
    gameId: 'TestStreamGameId',
    gameName: 'TestStreamGame',
};

describe('Death Count Repository (postgres)', () => {
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: DeathCountRepository;

    beforeAll(async () => {
        databaseConfiguration = await createTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase(databaseConfiguration);
    });

    describe('Valid Database Object', () => {
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

            await DeathCountDbo.destroy({ where: {}, force: true });
            subject = new DeathCountRepository(mockLogger);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('recordNewDeath()', () => {
            it('returns created record for stream', async () => {
                // Arrange
                // Act
                const result = await subject.recordNewDeath(mockStreamData);

                // Assert
                expect(result).toStrictEqual(expect.objectContaining({
                    deathCount: 1,
                    gameId: mockStreamData.gameId,
                    game: mockStreamData.gameName,
                    streamId: mockStreamData.id,
                }));
            });

            it('returns existing death record for stream', async () => {
                // Arrange
                const event: DeathCountDbo = <unknown>{
                    deathCount: 25,
                    streamId: mockStreamData.id,
                    gameId: mockStreamData.gameId,
                    game: mockStreamData.gameName,
                } as DeathCountDbo;

                const record = await DeathCountDbo
                    .create({
                        ...event,
                    }, { isNewRecord: true });
                // Act
                const result = await subject.recordNewDeath(mockStreamData);

                // Assert
                expect(record).not.toBe(null);
                expect(result).toStrictEqual(expect.objectContaining({
                    ...event,
                    deathCount: 26,
                }));
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const streamData = {} as HelixStream;
                const spy = jest.spyOn(DeathCountDbo, 'findOrCreate')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.recordNewDeath(streamData);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('getCurrentStreamDeathCount()', () => {
            it('returns null record for stream', async () => {
                // Arrange
                // Act
                const result = await subject.getCurrentStreamDeathCount(mockStreamData);

                // Assert
                expect(result).toBe(null);
            });
            it('returns found record for stream', async () => {
                // Arrange
                const event = {
                    deathCount: 25,
                    streamId: mockStreamData.id,
                    gameId: mockStreamData.gameId,
                    game: mockStreamData.gameName,
                };

                const record = await DeathCountDbo
                    .create({
                        ...event,
                    }, { isNewRecord: true });

                // Act
                const result = await subject.getCurrentStreamDeathCount(mockStreamData);

                // Assert
                expect(record).not.toBe(null);
                expect(result).toStrictEqual(expect.objectContaining(event));
            });
        });

        describe('getLastStreamDeathCount()', () => {
            it('returns record for current stream', async () => {
                // Arrange
                const event1 = {
                    deathCount: 2,
                    streamId: mockStreamData.id,
                    gameId: `${mockStreamData.gameId}-1`,
                    game: `${mockStreamData.gameName}-1`,
                };
                const event2 = {
                    deathCount: 5,
                    streamId: mockStreamData.id,
                    gameId: `${mockStreamData.gameId}-2`,
                    game: `${mockStreamData.gameName}-2`,
                };

                const record1 = await DeathCountDbo
                    .create({
                        ...event1,
                    }, { isNewRecord: true });

                const record2 = await DeathCountDbo
                    .create({
                        ...event2,
                    }, { isNewRecord: true });

                // Act
                const result = await subject.getLastStreamDeathCount(`${mockStreamData.id}-002`);

                // Assert
                expect(record1).not.toBe(null);
                expect(record2).not.toBe(null);
                expect(result.length).toEqual(2);
                expect(result).toContainEqual(expect.objectContaining(event1));
                expect(result).toContainEqual(expect.objectContaining(event2));
            });
        });
    });
});
