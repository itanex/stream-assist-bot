import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ApiClient, HelixUser } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler } from './iCommandHandler.js';
import { HugCommand } from './hugCommand.js';

describe('Hug Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

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
            .to(HugCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should hug a user in chat', () => {
        it.each([
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                [''],
                null,
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TestUser'],
                <HelixUser>{ displayName: 'TestUser', id: 'TestUserId' },
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TargetUser'],
                <HelixUser>{ displayName: 'TargetUser', id: 'TestUserId' },
            ],
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['TargetUser'],
                null,
            ],
        ])(`user: '%s', commandargs: '%s', target user: '%s'`, async (chatUser: ChatUser, args: string[], apiUser: HelixUser) => {
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
                .find(x => x.constructor.name === `${HugCommand.name}`);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            if (args[0]) {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledTimes(1);
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledWith(args[0]);
            } else {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledTimes(0);
            }

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringContaining(chatUser.displayName));

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
