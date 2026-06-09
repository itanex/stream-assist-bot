// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import fs from 'fs';
import axios from 'axios';
import { WebSocket as MockWebSocket } from 'ws';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { EightBallCommand } from './eightBallCommand';

jest.mock('ws', () => ({
    WebSocket: jest.fn(),
}));

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

        expectedChatClient = container.get(ChatClient);
        expectedLogger = container.get<winston.Logger>(InjectionTypes.Logger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function getSubject(): EightBallCommand {
        return container
            .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
            .find(x => x.constructor.name === EightBallCommand.name) as EightBallCommand;
    }

    describe(`Eightball Command`, () => {
        it(`should say response in chat when the audio file is already cached`, async () => {
            const langCode = 'en';
            const response = 'TestResponse';
            const subject = getSubject();

            subject['responses'] = [response];
            // File is already cached - TTS should not be called
            subject['fileExists'] = jest.fn().mockReturnValue(true);
            subject['broadcastAudio'] = jest.fn().mockResolvedValue(undefined);

            await subject.handle(channel, command, user, message, []);

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
            const langCode = 'en';
            const response = 'TestResponse';
            const subject = getSubject();

            subject['responses'] = [response];
            subject['fileExists'] = jest.fn().mockReturnValue(false);
            subject['broadcastAudio'] = jest.fn().mockResolvedValue(undefined);
            subject['getAudioFromGoogleTTS'] = jest.fn().mockResolvedValue('MTIzNDU2Nzg=');
            subject['generateFile'] = jest.fn().mockReturnValue(undefined);

            await subject.handle(channel, command, user, message, []);

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
            const response = 'TestResponse';
            const exception = new Error('TestExceptionMessage');
            const subject = getSubject();

            subject['responses'] = [response];
            subject['fileExists'] = jest.fn(() => { throw exception; });

            await subject.handle(channel, command, user, message, []);

            expect(expectedChatClient.say).not.toHaveBeenCalled();
            expect(expectedLogger.error)
                .toHaveBeenCalledWith(expect.stringContaining('Failed'), exception);
        });
    });

    describe(`Utilities - fileExists`, () => {
        it(`should return true when the file exists`, () => {
            const subject = getSubject();
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

            const result = subject['fileExists']('TestFilePath');

            expect(result).toBe(true);
            expect(spy).toHaveBeenCalledWith('TestFilePath');
        });

        it(`should return false when the file does not exist`, () => {
            const subject = getSubject();
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const result = subject['fileExists']('TestFilePath');

            expect(result).toBe(false);
            expect(spy).toHaveBeenCalledWith('TestFilePath');
        });
    });

    describe(`Utilities - getAudioFromGoogleTTS`, () => {
        it(`should POST to Google Translate and return base64 audio`, async () => {
            const subject = getSubject();
            const audioBase64 = 'SGVsbG8gV29ybGQ=';
            const innerPayload = JSON.stringify([audioBase64]);
            const outerData = JSON.stringify([[null, null, innerPayload]]);
            const mockResponse = { data: ")]}'\n" + outerData };

            const postSpy = jest.spyOn(axios, 'post').mockResolvedValue(mockResponse);

            const result = await subject['getAudioFromGoogleTTS']('Hello World');

            expect(postSpy).toHaveBeenCalledWith(
                'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute',
                expect.stringContaining('f.req='),
                expect.objectContaining({
                    timeout: 20000,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }),
            );
            expect(result).toBe(audioBase64);
        });

        it(`should throw when Google TTS returns no audio data`, async () => {
            const subject = getSubject();
            const innerPayload = JSON.stringify([null]);
            const outerData = JSON.stringify([[null, null, innerPayload]]);
            const mockResponse = { data: ")]}'\n" + outerData };

            jest.spyOn(axios, 'post').mockResolvedValue(mockResponse);

            await expect(subject['getAudioFromGoogleTTS']('Hello World'))
                .rejects.toThrow('Google TTS returned no audio data');
        });
    });

    describe(`Utilities - generateFile`, () => {
        it(`should create directories and write file when neither exist`, () => {
            const subject = getSubject();
            const buffer = Buffer.from('test');
            const rootPath = 'local-cache/audio/8ball';
            const filePath = `${rootPath}/abc123.en.mp3`;

            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
            const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

            subject['generateFile'](buffer, rootPath, filePath);

            expect(mkdirSpy).toHaveBeenCalledWith(rootPath, { recursive: true });
            expect(writeSpy).toHaveBeenCalledWith(filePath, buffer, { encoding: 'base64' });
        });

        it(`should write file without creating directories when root path already exists`, () => {
            const subject = getSubject();
            const buffer = Buffer.from('test');
            const rootPath = 'local-cache/audio/8ball';
            const filePath = `${rootPath}/abc123.en.mp3`;

            // First call is filePath (does not exist), second is rootPath (exists)
            jest.spyOn(fs, 'existsSync')
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
            const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

            subject['generateFile'](buffer, rootPath, filePath);

            expect(mkdirSpy).not.toHaveBeenCalled();
            expect(writeSpy).toHaveBeenCalledWith(filePath, buffer, { encoding: 'base64' });
        });
    });

    describe(`Utilities - broadcastAudio`, () => {
        it(`should connect to websocket and send a play message`, () => {
            const subject = getSubject();
            const mockSend = jest.fn();
            let capturedOnOpen: (() => void) | null = null;

            jest.mocked(MockWebSocket).mockImplementation(() => ({
                get onopen() { return capturedOnOpen; },
                set onopen(handler: () => void) {
                    capturedOnOpen = handler;
                    handler();
                },
                send: mockSend,
            }) as any);

            subject['broadcastAudio']('TestCommand', 'abc123', 'en');

            expect(mockSend).toHaveBeenCalledWith(
                expect.stringContaining('!play abc123 en'),
            );
        });
    });
});
