// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { HelixPrivilegedUser, HelixStream, HelixStreamType } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import Broadcaster from '../utilities/broadcaster';
import { ICommandHandler } from './iCommandHandler';
import { UpTimeCommand } from './upTimeCommand';

dayjs.extend(relativeTime);

describe('Up Time Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;
    let mockBroadcaster: Broadcaster;
    let mockBroadcastingUser: HelixPrivilegedUser;

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
        container.unbindAll();
        container
            .bind<ChatClient>(ChatClient)
            .toConstantValue(mockChatClient);

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        container
            .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
            .to(UpTimeCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    it.each([
        ['live', 'online'],
        ['', 'offline'],
    ])(`when type: '%s' should say '%s'`, async (type: HelixStreamType, state: string) => {
        // Arrange
        const testStreamData = { ...streamData, type } as HelixStream;

        mockBroadcastingUser = <unknown>{
            displayName: 'TestBroadcasterName',
            getStream: jest.fn().mockResolvedValue(testStreamData),
        } as HelixPrivilegedUser;

        mockBroadcaster = <unknown>{
            getBroadcaster: jest.fn().mockResolvedValue(mockBroadcastingUser),
        } as Broadcaster;

        container
            .bind(Broadcaster)
            .toConstantValue(mockBroadcaster);

        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === `${UpTimeCommand.name}`);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockBroadcaster.getBroadcaster).toHaveBeenCalledTimes(1);
        expect(mockBroadcastingUser.getStream).toHaveBeenCalledTimes(1);

        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect
                .stringContaining(mockBroadcastingUser.displayName));

        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect
                .stringContaining(dayjs(past).fromNow(true)));

        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(state));

        expect(expectedLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
