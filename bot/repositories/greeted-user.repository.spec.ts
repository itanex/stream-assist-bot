import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ChatUser } from '@twurple/chat';
import GreetedUserRepository from './greeted-user.repository.js';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import { mockError, mockLogger } from '../../tests/common.mocks.js';
import { GreetUser } from '../../database/index.js';

describe('GreetedUserRepository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: GreetedUserRepository;

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

        const basicUser = {
            displayName: 'test-basic-user',
            userId: '1234',
            isMod: false,
            isVip: false,
        } as unknown as ChatUser;
        const streamId = 'test-stream-id';

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

            await GreetUser.destroy({ where: {}, force: true });
            subject = new GreetedUserRepository(mockLogger);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('hasUser()', () => {
            it('user record is found', async () => {
                // Arrange
                await subject.saveUser(basicUser, streamId);

                // Act
                const result = await subject.hasUser(basicUser, streamId);

                // Assert
                expect(result).toBe(true);
            });

            it('user record is not found', async () => {
                // Arrange
                // Act
                const result = await subject.hasUser(basicUser, streamId);

                // Assert
                expect(result).toBe(false);
            });

            it('user record is not found on new stream (user previous stream record)', async () => {
                // Arrange
                const newStreamId = 'new-test-stream-id';
                await subject.saveUser(basicUser, streamId);

                // Act
                const result = await subject.hasUser(basicUser, newStreamId);

                // Assert
                expect(result).toBe(false);
            });
        });

        describe('saveUser()', () => {
            it('user is saved', async () => {
                // Arrange
                // Act
                const result = await subject.saveUser(basicUser, streamId);

                // Assert
                expect(result).toStrictEqual(expect.objectContaining({
                    displayName: basicUser.displayName,
                    userId: basicUser.userId,
                    streamId,
                    greetedAt: fixedDateTime,
                }));
            });
            it('logs error when record is not saved', async () => {
                // Arrange
                const spy = jest.spyOn(GreetUser, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.saveUser(basicUser, streamId);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });
    });
});
