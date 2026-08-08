import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import { HelixPrivilegedUser } from '@twurple/api';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import { CountExhaustCommand } from './countExhaustCommand.js';
import Broadcaster from '../utilities/broadcaster.js';

describe('Count Exhaust Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const mockBroadcaster = <unknown>{
        getBroadcaster: jest.fn(),
    } as jest.Mocked<Broadcaster>;

    let subject: CountExhaustCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        mockBroadcaster.getBroadcaster
            .mockResolvedValue(<unknown>{
                displayName: 'TestBroadcaster',
            } as HelixPrivilegedUser);

        subject = new CountExhaustCommand(
            mockChatClient,
            mockBroadcaster,
            mockLogger,
        );
    });

    it('should respond with a message to the channel', async () => {
        // Arrange
        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect.anything());
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.anything());
    });
});
