import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixPrivilegedUser, HelixStream, HelixStreamType } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import Broadcaster from '../utilities/broadcaster.js';
import { UpTimeCommand } from './upTimeCommand.js';

dayjs.extend(relativeTime);

describe('Up Time Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    let subject: UpTimeCommand;

    const mockBroadcaster = <unknown>{
        getBroadcaster: jest.fn(),
    } as jest.Mocked<Broadcaster>;

    const mockBroadcastingUser = <unknown>{
        displayName: 'TestBroadcasterName',
        getStream: jest.fn(),
    } as jest.Mocked<HelixPrivilegedUser>;

    const now = new Date();
    now.setMilliseconds(0);
    now.setSeconds(0);
    now.setMinutes(0);
    const past = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours() - 1,
        0,
        0,
        0,
    );

    const streamData: HelixStream = <unknown>{
        id: 'TestStreamId',
        gameId: 'TestStreamGameId',
        gameName: 'TestStreamGame',
        streamId: 'TestStreamId',
        type: 'live',
        startDate: past,
    } as HelixStream;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new UpTimeCommand(
            mockChatClient,
            mockBroadcaster,
            mockLogger,
        );
    });

    it.each([
        [<HelixStreamType>'live', 'online'],
        [<HelixStreamType>'', 'offline'],
    ])(`when type: '%s' should say '%s'`, async (type: HelixStreamType, state: string) => {
        // Arrange
        const testStreamData = { ...streamData, type } as HelixStream;

        mockBroadcastingUser
            .getStream
            .mockResolvedValue(testStreamData);

        mockBroadcaster
            .getBroadcaster
            .mockResolvedValue(mockBroadcastingUser);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockBroadcaster.getBroadcaster).toHaveBeenCalledTimes(1);
        expect(mockBroadcastingUser.getStream).toHaveBeenCalledTimes(1);

        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect
                .stringContaining(mockBroadcastingUser.displayName));

        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect
                .stringContaining(dayjs(past).fromNow(true)));

        expect(mockChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(state));

        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
