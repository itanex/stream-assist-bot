import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks.js';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler } from './iCommandHandler.js';
import { HelpCommand } from './helpCommand.js';

describe('Help Command Tests', () => {
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
            .to(HelpCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    it('should say something helpful in chat', async () => {
        // Arrange
        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === `${HelpCommand.name}`);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(expectedChatClient.say)
            .toHaveBeenCalledTimes(1);
        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.anything());

        expect(expectedLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
