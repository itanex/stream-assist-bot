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
import ThrowCommand from './throwCommand';

describe('Throw Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

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
            .to(ThrowCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('should throw soemthing in chat', () => {
        it.each([
            [['fish', '', '']],
            [['fish', '', 'TargetUser']],
        ])(`input: '%s'`, async (args: string[]) => {
            // Arrange
            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${ThrowCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(args[0]));

            if (args[2]) {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(args[2]));
            }

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });
});
