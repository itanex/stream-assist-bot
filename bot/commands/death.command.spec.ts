import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixStream } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockApiClient,
    mockLogger,
    mockCommandResponseRepository,
} from '../../tests/common.mocks.js';
import {
    DeathCommand,
    DeathCountCommand,
    LastDeathCountCommmand,
} from './death.command.js';
import { DeathCounts } from '../../database/index.js';
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

    const zeroRecord: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 0,
    } as DeathCounts;

    const fixedDateTime = new Date();

    beforeEach(() => {
        jest.resetAllMocks();
        jest.useFakeTimers().setSystemTime(fixedDateTime);

        mockApiClient
            .streams
            .getStreamByUserName
            .mockResolvedValue(streamData);
    });

    describe('Death Command', () => {
        let subject: DeathCommand;

        beforeEach(() => {
            subject = new DeathCommand(
                mockChatClient,
                mockApiClient,
                mockDeathCountRepository,
                mockLogger,
            );
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('records a new death count record and says something in chat', async () => {
            // Arrange
            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValue(createdRecord);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName)
                .toHaveBeenCalledTimes(1);

            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledWith(streamData);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.anything());
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());
        });

        it('records a death count record and says nothing in chat on second call', async () => {
            // Arrange
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
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledWith(streamData);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.anything());
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());
        });

        it('records a death count record and says something in chat on both calls (1, 10)', async () => {
            // Arrange
            mockDeathCountRepository
                .recordNewDeath
                .mockResolvedValueOnce(createdRecord)
                .mockResolvedValueOnce(existingRecord2);

            const mathSpy = jest.spyOn(Math, 'floor').mockImplementation(() => 0);

            // Act
            await subject.handle(channel, command, user, message, []);
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName)
                .toHaveBeenCalledTimes(2);

            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledTimes(2);
            expect(mockDeathCountRepository.recordNewDeath)
                .toHaveBeenCalledWith(streamData);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(2);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, subject['initialResponse']);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(2, channel, subject['responses'][0]);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());

            mathSpy.mockRestore();
        });
    });

    describe('Death Count Command', () => {
        let subject: DeathCountCommand;

        beforeEach(() => {
            subject = new DeathCountCommand(
                mockChatClient,
                mockApiClient,
                mockDeathCountRepository,
                mockLogger,
            );
        });

        it.each`
                label              | record
                ${'single deaths'} | ${createdRecord}
                ${'plural deaths'} | ${existingRecord1}
            `(`record: $label`, async ({ label, record }: { label: string, record: DeathCounts }) => {
            // Arrange
            mockDeathCountRepository
                .getCurrentStreamDeathCount
                .mockResolvedValue(record);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);

            expect(mockDeathCountRepository.getCurrentStreamDeathCount)
                .toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.getCurrentStreamDeathCount)
                .toHaveBeenCalledWith(streamData);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`${record.deathCount}`));
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('Last Death Count Command', () => {
        let subject: LastDeathCountCommmand;

        beforeEach(() => {
            subject = new LastDeathCountCommmand(
                mockChatClient,
                mockApiClient,
                mockCommandResponseRepository,
                mockDeathCountRepository,
                mockLogger,
            );
        });

        it.each`
            label                  | records
            ${'single record'}     | ${[createdRecord]}
            ${'multiple records'}  | ${[createdRecord, anotherRecord]}
        `(`report all death counts for: $label`, async ({ label, records }: { label: string; records: DeathCounts[] }) => {
            // Arrange
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

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(`%${transientKeywords.streamdate}%, %${transientKeywords.deathtotal}%, %${transientKeywords.streamcategory}%`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);

            expect(mockDeathCountRepository.getLastStreamDeathCount)
                .toHaveBeenCalledTimes(1);
            expect(mockDeathCountRepository.getLastStreamDeathCount)
                .toHaveBeenCalledWith(streamData.id);

            expect(mockCommandResponseRepository.getCommandText)
                .toHaveBeenCalledWith(subject.commandName);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(games));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`${total}`));
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());
        });

        it('logs a warning when no death count record is found', async () => {
            // Arrange
            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(undefined);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
