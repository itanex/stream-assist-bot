import 'reflect-metadata';
import { jest } from '@jest/globals';
import {
    HelixPrivilegedUser,
    HelixStream,
    HelixStreamType,
} from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import Broadcaster from '../utilities/broadcaster.js';
import { UpTimeCommand } from './upTimeCommand.js';

dayjs.extend(relativeTime);

describe('Up Time Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const responses = {
        uptime: {
            '': ['online: %broadcaster% %duration%'],
            offline: ['offline: %broadcaster% %duration%'],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

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

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new UpTimeCommand(
        mockChatClient,
        mockBroadcaster,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it.each`
        type      | state
        ${'live'} | ${'online'}
        ${''}     | ${'offline'}
    `(`when type: '$type' should say the '$state' text`, async ({ type, state }: { type: HelixStreamType, state: string }) => {
        // Arrange
        const subject = createSubject(responses);
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
            .toHaveBeenCalledWith(channel, `${state}: ${mockBroadcastingUser.displayName} ${dayjs(past).fromNow(true)}`);
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.any(String));
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        mockBroadcastingUser
            .getStream
            .mockResolvedValue(streamData);

        mockBroadcaster
            .getBroadcaster
            .mockResolvedValue(mockBroadcastingUser);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
