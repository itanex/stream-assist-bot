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
import { SocialsCommand } from './socialsCommand';
import environment from '../../configurations/environment';

describe('Socials Command Tests', () => {
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
            .to(SocialsCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    it('should say to chat the discord, youtube and twitter accounts', async () => {
        // Arrange
        const subject = container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === `${SocialsCommand.name}`);

        // Act
        await subject.handle(channel, command, user, message, []);

        // Assert
        expect(expectedChatClient.say)
            .toHaveBeenCalledTimes(1);
        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(environment.discordInvite));
        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(environment.twitter.link));
        expect(expectedChatClient.say)
            .toHaveBeenCalledWith(channel, expect.stringContaining(environment.youtube.link));

        expect(expectedLogger.info)
            .toHaveBeenCalledWith(expect
                .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
    });
});
