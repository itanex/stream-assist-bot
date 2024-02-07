// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import BrainCommand from './brainCommand';

describe('Brain Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;

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
            .to(BrainCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should report brain about target', () => {
        it.each([
            [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                [],
            ], [
                <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' },
                ['UserName'],
            ],
        ])(`user: '%s', target args: '%s'`, async (chatUser: ChatUser, args: string[]) => {
            // Arrange
            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${BrainCommand.name}`);

            // Act
            const user = args[0]
                ? args[0].toLocaleLowerCase().trim()
                : chatUser.displayName;
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect
                    .stringMatching(`(?=.*(\\b${user}\\b))(?=.*(\\b[0-9]{1,3}[%\\b]{1}))`));
            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${chatUser.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
