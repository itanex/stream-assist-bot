import 'reflect-metadata';
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

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;

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
        container.unbindAll();
        container
            .bind<ChatClient>(ChatClient)
            .toConstantValue(mockChatClient);

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        container
            .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
            .to(LastSubCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
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

            Subscribers.getLastSubscriber = jest.fn()
                .mockResolvedValue(mockSubscriber);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${LastSubCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);

            includedWords.forEach(x => {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(x));
            });

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)`));
        });
    });
});
