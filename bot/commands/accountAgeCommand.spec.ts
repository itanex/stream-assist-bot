// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ApiClient, HelixUser } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { AccountAgeCommand } from './accountAgeCommand';
import Timespan, { getAgeReport } from '../utilities/timeSpan';

describe('Account Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;
    let mockApiClient: ApiClient;

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
            .to(AccountAgeCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should report account age of target account', () => {
        it.each([
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                [],
                <HelixUser>{ displayName: 'TestUser', creationDate: new Date(2000, 0, 1) },
            ], [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['', 'UserName'],
                <HelixUser>{ displayName: 'UserName', creationDate: new Date(2000, 0, 1) },
            ],
        ])(`user: '%s', arguments: '%s', reported user '%s'`, async (chatUser: ChatUser, args: string[], apiUser: HelixUser) => {
            // Arrange
            mockApiClient = <unknown>{
                users: {
                    getUserByName: jest.fn().mockResolvedValue(apiUser),
                },
            } as ApiClient;

            container
                .bind<ApiClient>(ApiClient)
                .toConstantValue(mockApiClient);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === AccountAgeCommand.name);

            const age = getAgeReport(Timespan.fromNow(apiUser.creationDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[1]
                    ? args[1].toLocaleLowerCase().trim()
                    : chatUser.userName);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringMatching(`(?=.*\\b${apiUser.displayName}\\b)(?=.*\\b${age}\\b)`));
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${chatUser.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
