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
import { type Environment } from '../../configurations/environment.js';
import { RaidEvent } from '../../database/index.js';
import ChannelEventRepository from '../repositories/channel-event.repository.js';
import { LastRaidCommand } from './lastRaidCommand.js';

dayjs.extend(relativeTime);

const mockChannelEventRepository = <unknown>{
    getLastRaidEvent: jest.fn<(raidedBroadcasterId: string) => Promise<RaidEvent | null>>(),
} as jest.Mocked<ChannelEventRepository>;

describe('Last Raid Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const mockEnvironment = <unknown>{
        twitchBot: {
            broadcaster: {
                id: 'test-broadcaster-id',
            },
        },
    } as Environment;

    const raidTime = new Date(2020, 0, 1);
    const responses = {
        lastraid: {
            '': ['viewers: %raider% %when% %viewercount%'],
            single: ['single: %raider% %when%'],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new LastRaidCommand(
        mockChatClient,
        mockChannelEventRepository,
        createService(entries),
        mockEnvironment,
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should report in chat about the last raider', () => {
        it.each`
            viewers | prefix
            ${0}    | ${'single: TestRaidUser'}
            ${1}    | ${'single: TestRaidUser'}
            ${30}   | ${'viewers: TestRaidUser'}
        `(`with viewer count of $viewers says '$prefix ...'`, async ({ viewers, prefix }: { viewers: number, prefix: string }) => {
            // Arrange
            const subject = createSubject(responses);
            const mockRaidEvent: RaidEvent = <unknown>{
                raidDate: raidTime,
                viewers,
                raidingBroadcasterDisplayName: 'TestRaidUser',
            } as RaidEvent;

            mockChannelEventRepository
                .getLastRaidEvent
                .mockResolvedValue(mockRaidEvent);

            const when = dayjs(raidTime).fromNow();
            const expected = viewers > 1
                ? `${prefix} ${when} ${viewers}`
                : `${prefix} ${when}`;

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChannelEventRepository.getLastRaidEvent)
                .toHaveBeenCalledTimes(1);
            expect(mockChannelEventRepository.getLastRaidEvent)
                .toHaveBeenCalledWith(mockEnvironment.twitchBot.broadcaster.id);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when there is no incoming raid', async () => {
        // Arrange
        const subject = createSubject(responses);

        mockChannelEventRepository
            .getLastRaidEvent
            .mockResolvedValue(null);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChannelEventRepository.getLastRaidEvent)
            .toHaveBeenCalledWith(mockEnvironment.twitchBot.broadcaster.id);
        expect(mockCommandResponseService.getCommandResponse).not.toHaveBeenCalled();
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { raidedBroadcasterId: mockEnvironment.twitchBot.broadcaster.id });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        mockChannelEventRepository
            .getLastRaidEvent
            .mockResolvedValue(<unknown>{ raidDate: raidTime, viewers: 30, raidingBroadcasterDisplayName: 'TestRaidUser' } as RaidEvent);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
