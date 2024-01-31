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
import { CountExhaustCommand } from './countExhaustCommand';

describe('Count Exhaust Command Tests', () => {
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
            .to(CountExhaustCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    it('should respond with a message to the channel', async () => {
        // Arrange
        const channel = 'TestChannel';
        const command = 'TestAboutCommand';
        const message = 'TestMessage';
        const user = <ChatUser>{ displayName: 'TestUser' };

        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === CountExhaustCommand.name);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(mockChatClient.say).toHaveBeenCalledWith(channel, expect.anything());
        expect(expectedLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
