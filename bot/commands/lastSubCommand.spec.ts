import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { LastSubCommand } from './lastSubCommand.js';
import { Subscribers, SubscriptionType } from '../../database/index.js';
import SubscriberRepository from '../repositories/subscriber.repository.js';

const mockSubscriberRepository = <unknown>{
    getLastSubscriber: jest.fn<() => Promise<Subscribers | null>>(),
} as jest.Mocked<SubscriberRepository>;

describe('Last Sub Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: LastSubCommand;

    const mockSubscriber = <unknown>{
        createdAt: new Date(2020, 0, 1),
        type: null,
        subscriber: 'TestSubscriber',
        gift: {
            gifter: 'TestSubscriptionGifter',
            giftCount: 30,
        },
    } as Subscribers;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new LastSubCommand(
            mockChatClient,
            mockSubscriberRepository,
            mockLogger,
        );
    });

    describe('should report to chat who the last subscriber was', () => {
        it.each([
            [SubscriptionType.NewSub, [
                mockSubscriber.subscriber,
            ]],
            [SubscriptionType.PrimeSub, [
                mockSubscriber.subscriber,
            ]],
            [SubscriptionType.ReSub, [
                mockSubscriber.subscriber,
            ]],
            [SubscriptionType.GiftSub, [
                mockSubscriber.gift.gifter,
                mockSubscriber.subscriber,
            ]],
            [SubscriptionType.CommunitySub, [
                mockSubscriber.gift.gifter,
                `${mockSubscriber.gift.giftCount}`,
            ]],
        ])(`as a '%s' should report '%s' in chat`, async (type: SubscriptionType, includedWords: string[]) => {
            // Arrange
            mockSubscriber.type = type;

            mockSubscriberRepository
                .getLastSubscriber
                .mockResolvedValue(mockSubscriber);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);

            includedWords.forEach(x => {
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(x));
            });

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)`));
        });
    });
});
