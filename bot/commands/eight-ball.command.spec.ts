import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import fs from 'fs';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';

type AxiosModule = typeof import('axios');
type WsModule = typeof import('ws');
type EightBallCommandModule = typeof import('./eightBallCommand.js');

jest.unstable_mockModule('ws', () => ({
    WebSocket: jest.fn(),
    WebSocketServer: jest.fn(),
}));

jest.unstable_mockModule('../../configurations/environment.js', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            websocket: {
                host: 'localhost',
                port: 8080,
            },
        },
    },
}));

describe('Eight Ball Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const response = 'TestResponse eightball';
    const responses = { eightball: { '': [response] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    let axios: AxiosModule['default'];
    let mockWebSocket: jest.MockedClass<WsModule['WebSocket']>;
    let EightBallCommand: EightBallCommandModule['EightBallCommand'];
    let subject: InstanceType<EightBallCommandModule['EightBallCommand']>;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new EightBallCommand(
        mockChatClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(async () => {
        jest.resetModules();
        jest.resetAllMocks();

        // ESM: import after resetModules so spies target the subject's axios instance
        axios = (await import('axios')).default;

        // ESM: import after unstable_mockModule so the subject receives the mocked ws
        mockWebSocket = (await import('ws'))
            .WebSocket as jest.MockedClass<WsModule['WebSocket']>;

        ({ EightBallCommand } = await import('./eightBallCommand.js'));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe(`Eightball Command`, () => {
        it(`should say response in chat when the audio file is already cached`, async () => {
            const langCode = 'en';

            subject = createSubject(responses);
            // File is already cached - TTS should not be called
            subject['fileExists'] = jest.fn<InstanceType<EightBallCommandModule['EightBallCommand']>['fileExists']>().mockReturnValue(true);
            subject['broadcastAudio'] = jest.fn<InstanceType<EightBallCommandModule['EightBallCommand']>['broadcastAudio']>().mockReturnValue(undefined);

            await subject.handle(channel, command, user, message, []);

            expect(subject['broadcastAudio'])
                .toHaveBeenCalledWith(command, expect.any(String), langCode);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, response);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });

        it(`should generate a file if a file does not exist`, async () => {
            const langCode = 'en';

            subject = createSubject(responses);
            subject['fileExists'] = jest.fn<InstanceType<EightBallCommandModule['EightBallCommand']>['fileExists']>().mockReturnValue(false);
            subject['broadcastAudio'] = jest.fn().mockReturnValue(undefined);
            subject['getAudioFromGoogleTTS'] = jest.fn<InstanceType<EightBallCommandModule['EightBallCommand']>['getAudioFromGoogleTTS']>().mockResolvedValue('MTIzNDU2Nzg=');
            subject['generateFile'] = jest.fn().mockReturnValue(undefined);

            await subject.handle(channel, command, user, message, []);

            expect(subject['getAudioFromGoogleTTS'])
                .toHaveBeenCalledWith(response);
            expect(subject['generateFile'])
                .toHaveBeenCalledTimes(1);
            expect(subject['broadcastAudio'])
                .toHaveBeenCalledWith(command, expect.any(String), langCode);
            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, response);
            expect(mockLogger.info)
                .toHaveBeenCalledTimes(2);
            expect(mockLogger.info)
                .toHaveBeenNthCalledWith(1, expect.any(String));
            expect(mockLogger.info)
                .toHaveBeenNthCalledWith(2, expect.any(String));
        });

        it(`should log and do nothing when an exception is thrown`, async () => {
            const exception = new Error('TestExceptionMessage');

            subject = createSubject(responses);
            subject['fileExists'] = jest.fn(() => { throw exception; });

            await subject.handle(channel, command, user, message, []);

            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.error)
                .toHaveBeenCalledWith(expect.any(String), expect.any(Error));
        });

        it(`should say nothing and log warning when no text is configured`, async () => {
            subject = createSubject(unrelatedResponses);
            subject['broadcastAudio'] = jest.fn<InstanceType<EightBallCommandModule['EightBallCommand']>['broadcastAudio']>().mockReturnValue(undefined);

            await subject.handle(channel, command, user, message, []);

            expect(subject['broadcastAudio']).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn)
                .toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe(`Utilities - fileExists`, () => {
        beforeEach(() => {
            subject = createSubject(responses);
        });

        it(`should return true when the file exists`, () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);

            const result = subject['fileExists']('TestFilePath');

            expect(result).toBe(true);
            expect(spy).toHaveBeenCalledWith('TestFilePath');
        });

        it(`should return false when the file does not exist`, () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const result = subject['fileExists']('TestFilePath');

            expect(result).toBe(false);
            expect(spy).toHaveBeenCalledWith('TestFilePath');
        });
    });

    describe(`Utilities - getAudioFromGoogleTTS`, () => {
        beforeEach(() => {
            subject = createSubject(responses);
        });

        it(`should POST to Google Translate and return base64 audio`, async () => {
            const audioBase64 = 'SGVsbG8gV29ybGQ=';
            const innerPayload = JSON.stringify([audioBase64]);
            const outerData = JSON.stringify([[null, null, innerPayload]]);
            const mockResponse = { data: `)]}'\n${outerData}` };

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
            const innerPayload = JSON.stringify([null]);
            const outerData = JSON.stringify([[null, null, innerPayload]]);
            const mockResponse = { data: `)]}'\n${outerData}` };

            jest.spyOn(axios, 'post').mockResolvedValue(mockResponse);

            await expect(subject['getAudioFromGoogleTTS']('Hello World'))
                .rejects.toThrow('Google TTS returned no audio data');
        });
    });

    describe(`Utilities - generateFile`, () => {
        beforeEach(() => {
            subject = createSubject(responses);
        });

        it(`should create directories and write file when neither exist`, () => {
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
        type FakeSocket = {
            send: jest.Mock<(data: string) => void>,
            close: jest.Mock<() => void>,
            onopen?: () => void,
        };

        let socket: FakeSocket;

        beforeEach(() => {
            subject = createSubject(responses);

            // set after resetAllMocks, which clears mock implementations
            socket = { send: jest.fn(), close: jest.fn() };
            mockWebSocket.mockImplementation((() => socket) as any);
        });

        it(`should connect to the websocket and send a play message on open`, () => {
            subject['broadcastAudio'](command, 'abc123', 'en');
            socket.onopen!();

            expect(mockWebSocket)
                .toHaveBeenCalledWith('ws://localhost:8080/');
            expect(JSON.parse(socket.send.mock.calls[0][0]))
                .toEqual({
                    sender: command,
                    body: '!play abc123 en',
                    sentAt: expect.any(Number),
                });
            expect(socket.close)
                .toHaveBeenCalledTimes(1);
        });

        it(`should not send until the websocket opens`, () => {
            subject['broadcastAudio'](command, 'abc123', 'en');

            expect(socket.send).not.toHaveBeenCalled();
            expect(socket.close).not.toHaveBeenCalled();
        });
    });
});
