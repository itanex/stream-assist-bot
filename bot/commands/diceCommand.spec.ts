import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { DiceCommand, RollResult } from './diceCommand.js';

describe('Dice Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: DiceCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new DiceCommand(
            mockChatClient,
            mockLogger,
        );
    });

    describe('should provide results of dice rolls', () => {
        it.each([
            [['d8', '', '8'], [1, 8], { rolls: [5], total: 5 }],
            [['2d6', '2', '6'], [2, 6], { rolls: [1, 3], total: 4 }],
        ])(`input: '%s', '%s'`, async (args: string[], call: number[], rollDiceResult: RollResult) => {
            // Arrange
            // override private method so we can have a consistent assertion
            subject['rollDice'] = jest.fn<DiceCommand['rollDice']>().mockReturnValue(rollDiceResult);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(subject['rollDice'])
                .toHaveBeenCalledWith(call[0], call[1]);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`[ ${rollDiceResult.rolls.join(', ')} ]`));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(`total ${rollDiceResult.total}`));
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    it('should create (private)RollResult for provided values', () => {
        // Arrange
        // Act
        const actual: RollResult = subject['rollDice'](2, 6);

        // Assert
        expect(actual.rolls).toHaveLength(2);
        expect(actual.rolls.reduce((prev, cur) => prev + cur));
        expect(actual.total).toBeGreaterThanOrEqual(2);
        expect(actual.total).toBeLessThanOrEqual(12);
    });
});
