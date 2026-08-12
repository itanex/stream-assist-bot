import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler } from './iCommandHandler.js';
import { LastRaidCommand } from './lastRaidCommand.js';
import { Raiders } from '../../database/index.js';

describe('Last Raid Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;

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
            .to(LastRaidCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should report in chat about the last raider', () => {
        it.each([
            [0],
            [1],
            [30],
        ])(`with viewer count of: '%s'`, async (viewerCount: number) => {
            // Arrange
            const mockRaider: Raiders = <unknown>{
                time: new Date(2020, 0, 1),
                viewerCount,
                raider: 'TestRaidUser',
            } as Raiders;

            Raiders.getLastRaid = jest.fn()
                .mockResolvedValue(mockRaider);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${LastRaidCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(Raiders.getLastRaid)
                .toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(mockRaider.raider));

            if (viewerCount > 1) {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(`${mockRaider.viewerCount}`));
            }

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)`));
        });
    });
});
