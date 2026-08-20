import 'reflect-metadata';
import { jest } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
    ChatCommunitySubInfo,
    ChatSubExtendInfo,
    ChatSubGiftInfo,
    ChatSubInfo,
} from '@twurple/chat';
import Database, { IDatabaseConfiguration } from '../../database/database.js';
import SubscriberRepository from './subscriber.repository.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { Subscribers, SubscriptionType } from '../../database/index.js';

const mockError = new Error('[Test Error Message]: Mock', {
    cause: 'Database Save Failed',
});

describe('Subscription Repository (postgres)', () => {
    let container: StartedPostgreSqlContainer;
    let databaseConfiguration: IDatabaseConfiguration;

    const fixedDateTime = new Date();

    let subject: SubscriberRepository;

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

            await Subscribers.destroy({ where: {}, force: true });
            subject = new SubscriberRepository(mockLogger);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('createSubscriptionRecord()', () => {
            it.each`
                isPrime    | planId     | subType
                ${true}    | ${'Prime'} | ${SubscriptionType.PrimeSub}
                ${false}   | ${'1000'}  | ${SubscriptionType.NewSub}
                ${false}   | ${'2000'}  | ${SubscriptionType.NewSub}
                ${false}   | ${'3000'}  | ${SubscriptionType.NewSub}
            `('records the subscriber (prime:$isPrime, tier:$planId) in to the database', async ({ isPrime, planId, subType }) => {
                // Arrange
                const subscriber = {
                    isPrime,
                    months: 5,
                    plan: planId,
                    planName: 'test-sub-plan-name',
                    streak: 25,
                    // userId: 'test-sub-user-id',
                    // message: 'test-sub-message',
                } as ChatSubInfo;

                const fragment = {
                    displayName: 'test-sub-user-displayname',
                };

                // Act
                const result = await subject.createSubscriptionRecord({ ...subscriber, ...fragment } as ChatSubInfo);

                // Assert
                expect(result?.subscriber).toBe(fragment.displayName);
                expect(result?.type).toBe(subType);
                expect(result).toStrictEqual(expect.objectContaining(subscriber));
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as ChatSubInfo;
                const spy = jest.spyOn(Subscribers, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.createSubscriptionRecord(subscription);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('createSubscriptionExtendedRecord()', () => {
            it.each`
                isPrime    | planId
                ${true}    | ${'Prime'}
                ${false}   | ${'1000'}
                ${false}   | ${'2000'}
                ${false}   | ${'3000'}
            `('records the subscriber (prime:$isPrime, tier:$planId) in to the database', async ({ isPrime, planId }) => {
                // Arrange
                const subscriber = <unknown>{
                    months: 5,
                    plan: planId,
                    // planName: 'test-sub-plan-name',
                    // message: 'test-sub-message',
                } as ChatSubExtendInfo;

                const fragment = {
                    displayName: 'test-sub-user-displayname',
                    endMonth: 7,
                    userId: 'test-sub-user-id',
                    streak: 25,
                };

                // Act
                const result = await subject.createSubscriptionExtendedRecord({ ...subscriber, ...fragment } as ChatSubExtendInfo, isPrime);

                // Assert
                expect(result?.subscriber).toBe(fragment.displayName);
                expect(result?.type).toBe(SubscriptionType.ReSub);
                expect(result).toStrictEqual(expect.objectContaining(subscriber));
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as ChatSubExtendInfo;
                const isPrime = false;
                const spy = jest.spyOn(Subscribers, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.createSubscriptionExtendedRecord(subscription, isPrime);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('createSubscriptionResubRecord()', () => {
            it.each`
                isPrime    | planId
                ${true}    | ${'Prime'}
                ${false}   | ${'1000'}
                ${false}   | ${'2000'}
                ${false}   | ${'3000'}
            `('records the subscriber (prime:$isPrime, tier:$planId) in to the database', async ({ isPrime, planId }) => {
                // Arrange
                const subscriber = {
                    isPrime,
                    months: 5,
                    plan: planId,
                    planName: 'test-sub-plan-name',
                    streak: 25,
                    // userId: 'test-sub-user-id',
                    // message: 'test-sub-message',
                } as ChatSubInfo;

                const fragment = {
                    displayName: 'test-sub-user-displayname',
                };
                // Act
                const result = await subject.createSubscriptionResubRecord({ ...subscriber, ...fragment } as ChatSubInfo);

                // Assert
                expect(result?.subscriber).toBe(fragment.displayName);
                expect(result?.type).toBe(SubscriptionType.ReSub);
                expect(result).toStrictEqual(expect.objectContaining(subscriber));
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as ChatSubInfo;
                const spy = jest.spyOn(Subscribers, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.createSubscriptionResubRecord(subscription);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('createSubscriptionCommunityRecord()', () => {
            it.each`
                planId
                ${'1000'}
                ${'2000'}
                ${'3000'}
            `('records the subscriber (tier:$planId) in to the database', async ({ planId }) => {
                // Arrange
                const subscriber = <unknown>{
                    plan: planId,
                    gifterDisplayName: 'test-sub-gift-user-displayname',
                    // gifterUserId: 'test-sub-gift-user-id',
                    // gifter: 'test-sub-gift-user-name',
                    // gifterGiftCount: 525,
                    count: 5,
                } as ChatCommunitySubInfo;

                // Act
                const result = await subject.createSubscriptionCommunityRecord(subscriber);

                // Assert
                expect(result?.type).toBe(SubscriptionType.CommunitySub);
                expect(result?.plan).toBe(planId);
                expect(result?.gift.giftCount).toBe(subscriber.count);
                expect(result?.gift.gifter).toBe(subscriber.gifterDisplayName);
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as ChatCommunitySubInfo;
                const spy = jest.spyOn(Subscribers, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.createSubscriptionCommunityRecord(subscription);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('createSubscriptionGiftRecord()', () => {
            it.each`
                planId
                ${'1000'}
                ${'2000'}
                ${'3000'}
            `('records the subscriber (tier:$planId) in to the database', async ({ planId }) => {
                // Arrange
                const subscriber = <unknown>{
                    streak: 4,
                    months: 2,
                    plan: planId,
                    planName: 'test-sub-plan-name',
                    // gifterUserId: 'test-sub-gift-user-id',
                    // gifter: 'test-sub-gift-user-name',
                    // gifterGiftCount: 525,
                    // giftDuration: 1,
                } as ChatSubGiftInfo;

                const fragment = {
                    displayName: 'test-sub-user-displayname',
                    gifterDisplayName: 'test-sub-gift-user-displayname',
                };

                // Act
                const result = await subject.createSubscriptionGiftRecord({ ...subscriber, ...fragment } as ChatSubGiftInfo);

                // Assert
                expect(result?.type).toBe(SubscriptionType.GiftSub);
                expect(result?.subscriber).toBe(fragment.displayName);
                expect(result?.streak).toBe(subscriber.streak);
                expect(result?.months).toBe(subscriber.months);
                expect(result?.plan).toBe(subscriber.plan);
                expect(result?.planName).toBe(subscriber.planName);
                expect(result?.gift.gifter).toBe(fragment.gifterDisplayName);
            });

            it('logs error when record is not saved', async () => {
                // Arrange
                const subscription = {} as ChatSubGiftInfo;
                const spy = jest.spyOn(Subscribers, 'create')
                    .mockImplementation(() => { throw mockError; });

                // Act
                const result = await subject.createSubscriptionGiftRecord(subscription);

                // Assert
                expect(result).toBe(null);
                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), mockError);

                spy.mockRestore();
            });
        });

        describe('getLastSubscriber()', () => {
            it('returns the last subscriber in database', async () => {
                // Arrange
                const subscriber = {
                    isPrime: false,
                    months: 5,
                    plan: '1000',
                    planName: 'test-sub-plan-name',
                    streak: 25,
                    // userId: 'test-sub-user-id',
                    // message: 'test-sub-message',
                } as ChatSubInfo;

                const fragment = {
                    displayName: 'test-sub-user-displayname',
                };
                const record = await subject.createSubscriptionRecord({ ...subscriber, ...fragment } as ChatSubInfo);

                // Act
                const result = await subject.getLastSubscriber();

                // Assert
                expect(record).not.toBe(null);
                expect(result?.subscriber).toBe(fragment.displayName);
                expect(result).toStrictEqual(expect.objectContaining(subscriber));
            });
        });
    });
});
