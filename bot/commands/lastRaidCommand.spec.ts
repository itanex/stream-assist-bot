import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { LastRaidCommand } from './lastRaidCommand.js';
import { Raiders } from '../../database/index.js';

describe('Last Raid Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: LastRaidCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new LastRaidCommand(
            mockChatClient,
            mockLogger,
        );
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

            Raiders.getLastRaid = jest.fn<() => Promise<Raiders>>()
                .mockResolvedValue(mockRaider);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(Raiders.getLastRaid)
                .toHaveBeenCalledTimes(1);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(mockRaider.raider!));

            if (viewerCount > 1) {
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(`${mockRaider.viewerCount}`));
            }

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)`));
        });
    });
});
