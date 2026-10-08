import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { DiceCommand, RollResult } from './diceCommand.js';

describe('Dice Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const responses = { dice: { '': ['%dice% [ %rolls% ] total %total%'] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new DiceCommand(
        mockChatClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should provide results of dice rolls', () => {
        it.each`
            args                 | call       | rollDiceResult                  | expected
            ${['d8', '', '8']}   | ${[1, 8]}  | ${{ rolls: [5], total: 5 }}    | ${'d8 [ 5 ] total 5'}
            ${['2d6', '2', '6']} | ${[2, 6]}  | ${{ rolls: [1, 3], total: 4 }} | ${'2d6 [ 1, 3 ] total 4'}
        `(`input: '$args' says '$expected'`, async ({
            args,
            call,
            rollDiceResult,
            expected,
        }: { args: string[], call: number[], rollDiceResult: RollResult, expected: string }) => {
            // Arrange
            const subject = createSubject(responses);

            // override private method so we can have a consistent assertion
            subject['rollDice'] = jest.fn<DiceCommand['rollDice']>().mockReturnValue(rollDiceResult);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(subject['rollDice'])
                .toHaveBeenCalledWith(call[0], call[1]);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        // Act
        await subject.handle(channel, command, user, message, ['d6', '', '6']);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });

    it('should create (private)RollResult for provided values', async () => {
        // Arrange
        const subject = createSubject(responses);

        // Act
        const actual: RollResult = subject['rollDice'](2, 6);

        // Assert
        expect(actual.rolls).toHaveLength(2);
        expect(actual.total).toBeGreaterThanOrEqual(2);
        expect(actual.total).toBeLessThanOrEqual(12);
    });
});
