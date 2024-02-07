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
import { EightBallCommand } from './eightBallCommand';

describe('Eight Ball Command Tests', () => {
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
            .to(EightBallCommand);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe(`Eightball Command`, () => {
        it(`should say response in chat if a file that exists`, async () => {
            // Arrange
            const langCode = 'en';
            const response = 'TestResponse';

            const subject: EightBallCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${EightBallCommand.name}`) as EightBallCommand;

            // eslint-disable-next-line dot-notation
            subject['responses'] = [response];

            // eslint-disable-next-line dot-notation
            subject['fileExists'] = jest.fn().mockReturnValue(false);

            // eslint-disable-next-line dot-notation
            subject['broadcastAudio'] = jest.fn().mockResolvedValue(undefined);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            // eslint-disable-next-line dot-notation
            expect(subject['broadcastAudio'])
                .toHaveBeenCalledWith(command, expect.anything(), langCode);
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, response);

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });

        it(`should generate a file if a file does not exist`, async () => {
            // Arrange
            const langCode = 'en';
            const response = 'TestResponse';

            const subject: EightBallCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${EightBallCommand.name}`) as EightBallCommand;

            // eslint-disable-next-line dot-notation
            subject['responses'] = [response];

            // eslint-disable-next-line dot-notation
            subject['fileExists'] = jest.fn().mockReturnValue(false);

            // eslint-disable-next-line dot-notation
            subject['broadcastAudio'] = jest.fn().mockResolvedValue(undefined);

            // eslint-disable-next-line dot-notation
            subject['getAudioFromGoogleTTS'] = jest.fn().mockResolvedValue('MTIzNDU2Nzg=');

            // eslint-disable-next-line dot-notation
            subject['generateFile'] = jest.fn().mockReturnValue(undefined);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            // eslint-disable-next-line dot-notation
            expect(subject['broadcastAudio'])
                .toHaveBeenCalledWith(command, expect.anything(), langCode);
            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, response);

            expect(expectedLogger.info)
                .toHaveBeenNthCalledWith(1, expect.stringContaining('Generated file'));
            expect(expectedLogger.info)
                .toHaveBeenNthCalledWith(1, expect.stringContaining('local-cache/audio/8ball'));
            expect(expectedLogger.info)
                .toHaveBeenNthCalledWith(1, expect.stringContaining(EightBallCommand.name));

            expect(expectedLogger.info)
                .toHaveBeenNthCalledWith(2, expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });

        it(`should log and do nothing when an exception is thrown`, async () => {
            // Arrange
            const langCode = 'en';
            const response = 'TestResponse';
            const exception = new Error('TestExceptionMessage');

            const subject: EightBallCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${EightBallCommand.name}`) as EightBallCommand;

            // eslint-disable-next-line dot-notation
            subject['responses'] = [response];

            // eslint-disable-next-line dot-notation
            subject['fileExists'] = jest.fn(() => { throw exception; });

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(expectedChatClient.say).not.toHaveBeenCalled();

            expect(expectedLogger.error)
                .toHaveBeenCalledWith(expect.stringContaining('Failed'), exception);
        });
    });

    describe(`Utilities - fileExists`, () => {
        jest.mock('fs', () => ({
            existsSync: jest.fn().mockReturnValue(true),
        }));

        it(`should return the existance of a file`, () => {
            // Arrange
            jest.mock('fs', () => ({
                existsSync: jest.fn().mockReturnValue(true),
            }));

            const subject: EightBallCommand = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${EightBallCommand.name}`) as EightBallCommand;

            // Act
            // eslint-disable-next-line dot-notation
            const result = subject['fileExists'].call('TestFilePath');

            // Assert
            expect(result).toBe(true);
        });
    });

    describe(`Utilities - getAudioFromGoogleTTS`, () => {
        it(`should connect to GoogleTTS and send message`, () => {
            expect(0).toBe(1);
        });
    });

    describe(`Utilities - generateFile`, () => {
        it(`should make directories`, () => {
            expect(0).toBe(1);
        });

        it(`should write file`, () => {
            expect(0).toBe(1);
        });
    });

    describe(`Utilities - broadcastAudio`, () => {
        it(`should connect to websocket and send message`, () => {
            expect(0).toBe(1);
        });
    });
});
