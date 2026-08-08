import 'reflect-metadata';
import { HelixStream } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockApiClient, mockLogger, mockCommandResponseService } from '../../tests/common.mocks.js';
import { DeathCommand, DeathCountCommand, LastDeathCountCommmand } from './deathCommands.js';
import { DeathCounts } from '../../database/index.js';
import { transientKeywords } from '../utilities/default-responses.js';

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
        save: jest.fn().mockResolvedValue(undefined),
    } as DeathCounts;

    const existingRecord1: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 2,
        save: jest.fn().mockResolvedValue(undefined),
    } as DeathCounts;

    const existingRecord2: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 8,
        save: jest.fn().mockResolvedValue(undefined),
    } as DeathCounts;

    const anotherRecord: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 5,
        game: `${streamData.gameName} 2`,
        save: jest.fn().mockResolvedValue(undefined),
    } as DeathCounts;

    const zeroRecord: DeathCounts = <unknown>{
        ...createdRecord,
        deathCount: 0,
        save: jest.fn().mockResolvedValue(undefined),
    } as DeathCounts;

    beforeEach(() => {
        jest.resetAllMocks();
        mockApiClient.streams.getStreamByUserName = jest.fn().mockReturnValue(streamData);
    });

    describe('Death Command', () => {
        let subject: DeathCommand;

        beforeEach(() => {
            subject = new DeathCommand(
                mockChatClient,
                mockApiClient,
                mockLogger,
            );
        });

        describe('should record the death record appropriate for scenario', () => {
            it.each([
                [
                    createdRecord,
                    true,
                    false,
                ],
                [
                    existingRecord1,
                    false,
                    false,
                ],
                [
                    existingRecord2,
                    false,
                    true,
                ],
            ])(`record: '%s', created: '%s', hasTimeout: '%s'`, async (record: DeathCounts, created: boolean, hasTimeout: boolean) => {
                // Arrange
                DeathCounts.recordNewDeath = jest.fn()
                    .mockResolvedValue([record, created]);

                // Act
                await subject.handle(channel, command, user, message, []);

                if (hasTimeout) {
                    await subject.handle(channel, command, user, message, []);
                }

                // Assert
                expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(hasTimeout ? 2 : 1);

                expect(DeathCounts.recordNewDeath)
                    .toHaveBeenCalledTimes(hasTimeout ? 2 : 1);
                expect(DeathCounts.recordNewDeath)
                    .toHaveBeenCalledWith(streamData);

                expect(mockChatClient.say)
                    .toHaveBeenCalledTimes(hasTimeout ? 2 : 1);
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.anything());
                expect(mockLogger.info)
                    .toHaveBeenCalledWith(expect.anything());
            });
        });
    });

    describe('Death Count Command', () => {
        let subject: DeathCountCommand;

        beforeEach(() => {
            subject = new DeathCountCommand(
                mockChatClient,
                mockApiClient,
                mockLogger,
            );
        });

        describe('should report death count of record, creating 0 record if no record', () => {
            it.each([
                [createdRecord],
                [existingRecord1],
                [zeroRecord],
            ])(`record: '%s'`, async (record: DeathCounts) => {
                // Arrange
                DeathCounts.getCurrentStreamDeathCount = jest.fn()
                    .mockResolvedValue([record]);

                // Act
                await subject.handle(channel, command, user, message, []);

                // Assert
                expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);

                expect(DeathCounts.getCurrentStreamDeathCount)
                    .toHaveBeenCalledTimes(1);
                expect(DeathCounts.getCurrentStreamDeathCount)
                    .toHaveBeenCalledWith(streamData);

                expect(mockChatClient.say)
                    .toHaveBeenCalledTimes(1);
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(`${record.deathCount}`));
                expect(mockLogger.info)
                    .toHaveBeenCalledWith(expect.anything());
            });
        });
    });

    describe('Last Death Count Command', () => {
        let subject: LastDeathCountCommmand;

        beforeEach(() => {
            subject = new LastDeathCountCommmand(
                mockChatClient,
                mockApiClient,
                mockCommandResponseService,
                mockLogger,
            );
        });

        describe('should report all deaths for all returned records', () => {
            it.each([
                [[createdRecord]],
                [[createdRecord, anotherRecord]],
            ])(`record collection: '%s'`, async (records: DeathCounts[]) => {
                // Arrange
                const games = records
                    .map(record => `${record.game} (${record.deathCount})`)
                    .join(', ');
                const total = records
                    .flat()
                    .flatMap(value => value.deathCount)
                    .reduce((prev: number, cur: number) => prev + cur);

                DeathCounts.getLastStreamDeathCount = jest.fn()
                    .mockResolvedValue(records);

                mockCommandResponseService
                    .getCommandText
                    .mockReturnValue(`%${transientKeywords.streamdate}%, %${transientKeywords.deathtotal}%, %${transientKeywords.streamcategory}%`);

                // Act
                await subject.handle(channel, command, user, message, []);

                // Assert
                expect(mockApiClient.streams.getStreamByUserName).toHaveBeenCalledTimes(1);

                expect(DeathCounts.getLastStreamDeathCount)
                    .toHaveBeenCalledTimes(1);
                expect(DeathCounts.getLastStreamDeathCount)
                    .toHaveBeenCalledWith(streamData.id);

                expect(mockCommandResponseService.getCommandText)
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
        });
    });
});
