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
import { CuddleCommand } from './cuddleCommand';

describe('Cuddle Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const args = ['@UserName'];
    const user = <ChatUser>{ displayName: 'TestUser' };
    const targetUser = 'TargetUser';

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
            .to(CuddleCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    it('should call chatClient.say with both user name and log', async () => {
        // arrange
        mockApiClient = <unknown>{
            users: {
                getUserByName: jest.fn().mockResolvedValue({
                    displayName: targetUser,
                }),
            },
        } as ApiClient;

        container
            .bind<ApiClient>(ApiClient)
            .toConstantValue(mockApiClient);

        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === `${CuddleCommand.name}`);

        // act
        const result = await subject.handle(channel, command, user, message, args);

        // assert
        expect(mockApiClient.users.getUserByName)
            .toHaveBeenCalledWith(args[0].toLocaleLowerCase().trim());
        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringMatching(`(?=.*\\b${user.displayName}\\b)(?=.*\\b${targetUser}\\b)`));
        expect(expectedLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });

    describe('Parameterized failed calls when', () => {
        it.each([
            [<ChatUser>{ displayName: 'TestUser' }, null],
            [<ChatUser>{ displayName: 'TestUser' }, <HelixUser>{ displayName: 'TestUser' }],
        ])(`input: '%s', '%s'`, async (chatUser: ChatUser, apiUser: HelixUser) => {
            // arrange
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
                .find(x => x.constructor.name === `${CuddleCommand.name}`);

            // act
            await subject.handle(channel, command, chatUser, message, args);

            // assert
            expect(mockApiClient.users.getUserByName)
                .toHaveBeenCalledWith(args[0].toLocaleLowerCase().trim());
            expect(expectedChatClient.say).toHaveBeenCalledTimes(0);
            expect(expectedLogger.info).toHaveBeenCalledTimes(0);
        });
    });
});
