import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { Subscribers, SubscriptionType } from '../../database/index.js';
import SubscriberRepository from '../repositories/subscriber.repository.js';
import { LastSubCommand } from './lastSubCommand.js';

dayjs.extend(relativeTime);

const mockSubscriberRepository = <unknown>{
    getLastSubscriber: jest.fn<() => Promise<Subscribers | null>>(),
} as jest.Mocked<SubscriberRepository>;

describe('Last Sub Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const createdAt = new Date(2020, 0, 1);
    const responses = {
        lastsub: {
            newsub: ['newsub: %subscriber% %when%'],
            primesub: ['primesub: %subscriber% %when%'],
            resub: ['resub: %subscriber% %when%'],
            giftsub: ['giftsub: %gifter% %subscriber% %when%'],
            communitysub: ['communitysub: %gifter% %giftcount% %when%'],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    const mockSubscriber = <unknown>{
        createdAt,
        type: null,
        subscriber: 'TestSubscriber',
        gift: {
            gifter: 'TestSubscriptionGifter',
            giftCount: 30,
        },
    } as Subscribers;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new LastSubCommand(
        mockChatClient,
        mockSubscriberRepository,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should report to chat who the last subscriber was', () => {
        it.each([
            [SubscriptionType.NewSub, 'newsub: TestSubscriber'],
            [SubscriptionType.PrimeSub, 'primesub: TestSubscriber'],
            [SubscriptionType.ReSub, 'resub: TestSubscriber'],
            [SubscriptionType.GiftSub, 'giftsub: TestSubscriptionGifter TestSubscriber'],
            [SubscriptionType.CommunitySub, 'communitysub: TestSubscriptionGifter 30'],
        ])(`as a '%s' should say '%s'`, async (type: SubscriptionType, prefix: string) => {
            // Arrange
            const subject = createSubject(responses);
            mockSubscriber.type = type;

            mockSubscriberRepository
                .getLastSubscriber
                .mockResolvedValue(mockSubscriber);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `${prefix} ${dayjs(createdAt).fromNow()}`);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);
        mockSubscriber.type = SubscriptionType.NewSub;

        mockSubscriberRepository
            .getLastSubscriber
            .mockResolvedValue(mockSubscriber);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: 'newsub' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
