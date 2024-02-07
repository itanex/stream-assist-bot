// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { HelixPrivilegedUser, HelixStream } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { DeathCommand, DeathCountCommand, LastDeathCountCommmand } from './deathCommands';
import Broadcaster from '../utilities/broadcaster';
import { DeathCounts } from '../../database';

describe('Death Commands Tests', () => {
    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;
    let mockBroadcaster: Broadcaster;
    let mockBroadcastingUser: HelixPrivilegedUser;

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

    const existingRecord1: DeathCounts = <DeathCounts>{
        ...createdRecord,
        deathCount: 2,
    };

    const existingRecord2: DeathCounts = <DeathCounts>{
        ...createdRecord,
        deathCount: 8,
    };

    const anotherRecord: DeathCounts = <DeathCounts>{
        ...createdRecord,
        deathCount: 5,
        game: `${streamData.gameName} 2`,
    };

    beforeEach(() => {
        jest.resetAllMocks();
        container.unbindAll();
        container
            .bind<ChatClient>(ChatClient)
            .toConstantValue(mockChatClient);

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);

        mockBroadcastingUser = <unknown>{
            getStream: jest.fn().mockResolvedValue(streamData),
        } as HelixPrivilegedUser;

        mockBroadcaster = <unknown>{
            getBroadcaster: jest.fn().mockResolvedValue(mockBroadcastingUser),
        } as Broadcaster;

        container
            .bind(Broadcaster)
            .toConstantValue(mockBroadcaster);
    });

    describe('Death Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(DeathCommand);
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

                const subject = container
                    .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                    .find(x => x.constructor.name === `${DeathCommand.name}`);

                // Act
                if (hasTimeout) {
                    await Promise.all([
                        await subject.handle(channel, command, user, message, []),
                        await subject.handle(channel, command, user, message, []),
                    ]);
                } else {
                    await subject.handle(channel, command, user, message, []);
                }

                // Assert
                expect(mockBroadcaster.getBroadcaster).toHaveBeenCalledTimes(hasTimeout ? 2 : 1);
                expect(mockBroadcastingUser.getStream).toHaveBeenCalledTimes(hasTimeout ? 2 : 1);

                expect(DeathCounts.recordNewDeath)
                    .toHaveBeenCalledTimes(hasTimeout ? 2 : 1);
                expect(DeathCounts.recordNewDeath)
                    .toHaveBeenCalledWith(streamData);

                expect(expectedChatClient.say)
                    .toHaveBeenCalledTimes(hasTimeout ? 2 : 1);
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.anything());
                expect(expectedLogger.info)
                    .toHaveBeenCalledWith(expect
                        .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${record.deathCount}\\b)`));
            });
        });
    });

    describe('Death Count Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(DeathCountCommand);
        });

        describe('should report death count of record, creating 0 record if no record', () => {
            it.each([
                [createdRecord],
                [existingRecord1],
            ])(`record: '%s'`, async (record: DeathCounts) => {
                // Arrange
                DeathCounts.getCurrentStreamDeathCount = jest.fn()
                    .mockResolvedValue([record]);

                const subject = container
                    .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                    .find(x => x.constructor.name === `${DeathCountCommand.name}`);

                // Act
                await subject.handle(channel, command, user, message, []);

                // Assert
                expect(mockBroadcaster.getBroadcaster).toHaveBeenCalledTimes(1);
                expect(mockBroadcastingUser.getStream).toHaveBeenCalledTimes(1);

                expect(DeathCounts.getCurrentStreamDeathCount)
                    .toHaveBeenCalledTimes(1);
                expect(DeathCounts.getCurrentStreamDeathCount)
                    .toHaveBeenCalledWith(streamData);

                expect(expectedChatClient.say)
                    .toHaveBeenCalledTimes(1);
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(`${record.deathCount}`));
                expect(expectedLogger.info)
                    .toHaveBeenCalledWith(expect
                        .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${record.deathCount}\\b)`));
            });
        });
    });

    describe('Last Death Death Count Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(LastDeathCountCommmand);
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

                const subject = container
                    .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                    .find(x => x.constructor.name === `${LastDeathCountCommmand.name}`);

                // Act
                await subject.handle(channel, command, user, message, []);

                // Assert
                expect(mockBroadcaster.getBroadcaster).toHaveBeenCalledTimes(1);
                expect(mockBroadcastingUser.getStream).toHaveBeenCalledTimes(1);

                expect(DeathCounts.getLastStreamDeathCount)
                    .toHaveBeenCalledTimes(1);
                expect(DeathCounts.getLastStreamDeathCount)
                    .toHaveBeenCalledWith(streamData.id);

                expect(expectedChatClient.say)
                    .toHaveBeenCalledTimes(1);
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(games));
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(`${total} timys`));
                expect(expectedLogger.info)
                    .toHaveBeenCalledWith(expect
                        .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)`));
            });
        });
    });
});
