import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixStream } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { DeathCounts } from '../../database/index.js';
import {
    DeathCommand,
    DeathCountCommand,
    LastDeathCountCommmand,
} from './death.command.js';
import { transientKeywords } from '../utilities/default-responses.js';
import DeathCountRepository from '../repositories/death-count.repository.js';

const mockDeathCountRepository = <unknown>{
    getCurrentStreamDeathCount: jest.fn<DeathCountRepository['getCurrentStreamDeathCount']>(),
    recordNewDeath: jest.fn<DeathCountRepository['recordNewDeath']>(),
    getLastStreamDeathCount: jest.fn<DeathCountRepository['getLastStreamDeathCount']>(),
} as jest.Mocked<DeathCountRepository>;

describe('Death Commands Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    const streamData: HelixStream = <unknown>{
        id: 'TestStreamId',
        gameId: 'TestStreamGameId',
        gameName: 'TestStreamGame',
        streamId: 'TestStreamId',
    } as HelixStream;

    const createdRecord: DeathCounts = <unknown>{
        deathCount: 1,
        streamId: streamData.id,
        gameId: streamData.gameId,
        game: streamData.gameName,
    } as DeathCounts;

    const existingRecord1: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 2,
    } as DeathCounts;

    const existingRecord2: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 10,
    } as DeathCounts;

    const anotherRecord: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 5,
        game: `${streamData.gameName} 2`,
    } as DeathCounts;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    beforeEach(() => {
        mockApiClient
            .streams
            .getStreamByUserName
            .mockResolvedValue(streamData);
    });

    describe('Death Command', () => {
        const responses = {
            death: {
                first: ['first death response'],
                '': ['milestone death response'],
            },
        };

        const createSubject = (entries: Record<string, Record<string, string[]>>) => new DeathCommand(
            mockChatClient,
            mockApiClient,
            createService(entries),
            mockDeathCountRepository,
            mockLogger,
        );

        it('records a new death count record and says something in chat', async () => {
            // Arrange
            const subject = createSubject(responses);

            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValue(createdRecord);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName)
                .toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledWith(streamData);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, 'first death response');
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it('records a death count record and says nothing in chat on second call', async () => {
            // Arrange
            const subject = createSubject(responses);

            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValue(createdRecord);

            // Act
            await subject.handle(channel, command, user, message, []);
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName)
                .toHaveBeenCalledTimes(2);
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledTimes(2);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it('records a death count record and says something in chat on both calls (1, 10)', async () => {
            // Arrange
            const subject = createSubject(responses);

            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValueOnce(createdRecord)
                .mockResolvedValueOnce(existingRecord2);

            // Act
            await subject.handle(channel, command, user, message, []);
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(2);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, 'first death response');
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(2, channel, 'milestone death response');
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it('records a new death count record and logs a warning when no text is configured', async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValue(createdRecord);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledWith(streamData);
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: 'first' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('Death Count Command', () => {
        const responses = {
            deathcount: {
                '': [`plural: %${transientKeywords.deathtotal}%`],
                single: [`single: %${transientKeywords.deathtotal}%`],
            },
        };

        const createSubject = (entries: Record<string, Record<string, string[]>>) => new DeathCountCommand(
            mockChatClient,
            mockApiClient,
            createService(entries),
            mockDeathCountRepository,
            mockLogger,
        );

        it.each`
                label              | record              | expected
                ${'single deaths'} | ${createdRecord}    | ${'single: 1'}
                ${'plural deaths'} | ${existingRecord1}  | ${'plural: 2'}
            `(`record: $label`, async ({ record, expected }: { label: string, record: DeathCounts, expected: string }) => {
            // Arrange
            const subject = createSubject(responses);

            mockDeathCountRepository
                .getCurrentStreamDeathCount
                .mockResolvedValue(record);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.getCurrentStreamDeathCount)
                .toHaveBeenCalledWith(streamData);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it('logs a warning and says nothing when no text is configured', async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            mockDeathCountRepository
                .getCurrentStreamDeathCount
                .mockResolvedValue(existingRecord1);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('Last Death Count Command', () => {
        const responses = {
            lastdeathcount: {
                '': [`%${transientKeywords.streamdate}% | %${transientKeywords.deathtotal}% | %${transientKeywords.streamcategory}%`],
            },
        };

        const createSubject = (entries: Record<string, Record<string, string[]>>) => new LastDeathCountCommmand(
            mockChatClient,
            mockApiClient,
            createService(entries),
            mockDeathCountRepository,
            mockLogger,
        );

        it.each`
            label                  | records
            ${'single record'}     | ${[createdRecord]}
            ${'multiple records'}  | ${[createdRecord, anotherRecord]}
        `(`report all death counts for: $label`, async ({ records }: { label: string; records: DeathCounts[] }) => {
            // Arrange
            const subject = createSubject(responses);

            const games = records
                .map(record => `${record.game} (${record.deathCount})`)
                .join(', ');

            const total = records
                .flat()
                .flatMap(value => value.deathCount)
                .reduce((prev: number, cur: number) => prev + cur);

            mockDeathCountRepository
                .getLastStreamDeathCount
                .mockResolvedValue(records);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.getLastStreamDeathCount)
                .toHaveBeenCalledWith(streamData.id);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(` | ${total} | ${games}`));
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it('logs a warning and says nothing when no text is configured', async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            mockDeathCountRepository
                .getLastStreamDeathCount
                .mockResolvedValue([createdRecord]);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
