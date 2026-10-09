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
import { Raiders } from '../../database/index.js';
import RaidRepository from '../repositories/raid.repository.js';
import { LastRaidCommand } from './lastRaidCommand.js';

dayjs.extend(relativeTime);

const mockRaidRepository = <unknown>{
    getLastRaid: jest.fn<() => Promise<Raiders>>(),
} as jest.Mocked<RaidRepository>;

describe('Last Raid Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

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
        mockRaidRepository,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should report in chat about the last raider', () => {
        it.each`
            viewerCount | prefix
            ${0}        | ${'single: TestRaidUser'}
            ${1}        | ${'single: TestRaidUser'}
            ${30}       | ${'viewers: TestRaidUser'}
        `(`with viewer count of $viewerCount says '$prefix ...'`, async ({ viewerCount, prefix }: { viewerCount: number, prefix: string }) => {
            // Arrange
            const subject = createSubject(responses);
            const mockRaider: Raiders = <unknown>{
                time: raidTime,
                viewerCount,
                raider: 'TestRaidUser',
            } as Raiders;

            mockRaidRepository
                .getLastRaid
                .mockResolvedValue(mockRaider);

            const when = dayjs(raidTime).fromNow();
            const expected = viewerCount > 1
                ? `${prefix} ${when} ${viewerCount}`
                : `${prefix} ${when}`;

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockRaidRepository.getLastRaid)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        mockRaidRepository
            .getLastRaid
            .mockResolvedValue(<unknown>{ time: raidTime, viewerCount: 30, raider: 'TestRaidUser' } as Raiders);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
