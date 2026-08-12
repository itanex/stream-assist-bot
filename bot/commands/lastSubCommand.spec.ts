import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler } from './iCommandHandler.js';
import { LastSubCommand } from './lastSubCommand.js';
import { Subscribers, SubscriptionType } from '../../database/index.js';

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

            Subscribers.getLastSubscriber = jest.fn<() => Promise<Subscribers>>()
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
