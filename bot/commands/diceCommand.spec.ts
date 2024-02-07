// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { DiceCommand, RollResult } from './diceCommand';

describe('Dice Command Tests', () => {
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
            .to(DiceCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should provide results of dice rolls', () => {
        it.each([
            [['d8', '', '8'], [1, 8], { rolls: [5], total: 5 }],
            [['2d6', '2', '6'], [2, 6], { rolls: [1, 3], total: 4 }],
        ])(`input: '%s', '%s'`, async (args: string[], call: number[], rollDiceResult: RollResult) => {
            // Arrange
            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${DiceCommand.name}`);

            // override private method so we can have a consistent assertion
            // eslint-disable-next-line dot-notation
            subject['rollDice'] = jest.fn().mockReturnValue(rollDiceResult);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            // eslint-disable-next-line dot-notation
            expect(subject['rollDice'])
                .toHaveBeenCalledWith(call[0], call[1]);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`[ ${rollDiceResult.rolls.join(', ')} ]`));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`total ${rollDiceResult.total}`));
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    it('should create (private)RollResult for provided values', () => {
        // Arrange
        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === `${DiceCommand.name}`);

        // Act
        // eslint-disable-next-line dot-notation
        const actual: RollResult = subject['rollDice'](2, 6);

        // Assert
        expect(actual.rolls).toHaveLength(2);
        expect(actual.rolls.reduce((prev, cur) => prev + cur));
        expect(actual.total).toBeGreaterThan(2);
        expect(actual.total).toBeLessThanOrEqual(12);
    });
});
