import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import StreamEventRepository from './stream-event.repository.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { StreamEventRecord } from '../../database/index.js';

const mockError = new Error('[Test Error Message]: Mock', {
    cause: 'Database Save Failed',
});

describe('Stream Event Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: StreamEventRepository;

    beforeAll(async () => {
        try {
            container = await new PostgreSqlContainer('postgres:latest').start();
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

        databaseConfiguration = {
            database: container.getDatabase(),
            host: container.getHost(),
            username: container.getUsername(),
            password: container.getPassword(),
            port: container.getPort(),
        };
    }, 120_000);

    afterAll(async () => {
        await container.stop();
    });

    describe('Valid Database Object', () => {
        let database: Database;

        beforeAll(async () => {
            database = new Database(databaseConfiguration, mockLogger);
            await database.initialize();
        });

        afterAll(async () => {
            await database.disconnect();
        });

        beforeEach(async () => {
            jest.resetAllMocks();
            jest.useFakeTimers().setSystemTime(fixedDateTime);

            await StreamEventRecord.destroy({ where: {}, force: true });
            subject = new StreamEventRepository(mockLogger);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('getLastStream()', () => {
            it('should return last completed Stream Event record', async () => {
                // Arrange
                const id = 'test-stream-id';
                const event = {
                    type: 'live',
                    startDate: fixedDateTime,
                    endDate: fixedDateTime,
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'test-broadcaster-displayname',
                };

                const record = await StreamEventRecord
                    .create({
                        streamId: id,
                        type: event.type,
                        startDate: event.startDate,
                        endDate: event.endDate,
                        broadcasterId: event.broadcasterId,
                        broadcasterName: event.broadcasterName,
                        broadcasterDisplayName: event.broadcasterDisplayName,
                    }, {
                        isNewRecord: true,
                        validate: true,
                    });

                // Act
                const result = await subject.getLastStream(event.broadcasterId);

                // Assert
                expect(record).not.toBe(null);
                expect(result?.streamId).toBe(id);
                expect(result).toStrictEqual(expect.objectContaining(event));
            });
        });

        describe('saveStreamStartEvent', () => {
            it('saves a Stream Start Event record to database', async () => {
                // Arrange
                const id = 'test-stream-id';
                const details = {
                    type: 'live',
                    startDate: fixedDateTime,
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'test-broadcaster-displayname',
                };
                const event = {
                    id,
                    ...details,
                } as EventSubStreamOnlineEvent;

                // Act
                const result = await subject.saveStreamStartEvent(event);

                // Assert
                expect(result?.streamId).toBe(id);
                expect(result).toStrictEqual(expect.objectContaining(details));
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as EventSubStreamOnlineEvent;
                const spy = jest.spyOn(StreamEventRecord, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.saveStreamStartEvent(subscription);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('saveStreamEndEvent', () => {
            it('updates the Stream (end) Event record in the database', async () => {
                // Arrange
                const id = 'test-stream-id';
                const details = {
                    type: 'live',
                    startDate: fixedDateTime,
                    broadcasterId: 'test-broadcaster-id',
                    broadcasterName: 'test-broadcaster-name',
                    broadcasterDisplayName: 'test-broadcaster-displayname',
                };
                const event = {
                    id,
                    ...details,
                } as EventSubStreamOnlineEvent;
                const record = await subject.saveStreamStartEvent(event);
                // Act
                const [count, result] = await subject.saveStreamEndEvent(fixedDateTime, event);

                // Assert
                expect(count).toBe(1);
                expect(result[0].endDate).toStrictEqual(fixedDateTime);
                expect(result[0]).toStrictEqual(expect.objectContaining(details));
            });
        });
    });
});
