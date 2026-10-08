import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import fs from 'fs';
import axios from 'axios';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { EightBallCommand } from './eightBallCommand.js';

jest.unstable_mockModule('ws', () => ({
    WebSocket: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
}));

describe('Eight Ball Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const response = 'TestResponse eightball';
    const responses = { eightball: { '': [response] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    let subject: EightBallCommand;

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

    beforeEach(() => {
        jest.resetAllMocks();
    });

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe(`Eightball Command`, () => {
        it(`should say response in chat when the audio file is already cached`, async () => {
            const langCode = 'en';

            subject = createSubject(responses);
            // File is already cached - TTS should not be called
            subject['fileExists'] = jest.fn<EightBallCommand['fileExists']>().mockReturnValue(true);
            subject['broadcastAudio'] = jest.fn<EightBallCommand['broadcastAudio']>().mockReturnValue(undefined);

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
            subject['fileExists'] = jest.fn<EightBallCommand['fileExists']>().mockReturnValue(false);
            subject['broadcastAudio'] = jest.fn().mockReturnValue(undefined);
            subject['getAudioFromGoogleTTS'] = jest.fn<EightBallCommand['getAudioFromGoogleTTS']>().mockResolvedValue('MTIzNDU2Nzg=');
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
            subject['broadcastAudio'] = jest.fn<EightBallCommand['broadcastAudio']>().mockReturnValue(undefined);

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
        beforeEach(() => {
            subject = createSubject(responses);
        });

        // let mockWebSocket: jest.MockedClass<WsModule['WebSocket']>;

        // beforeEach(async () => {
        //     WebSocket = (await import('ws'))
        //         .WebSocket as jest.MockedClass<WsModule['WebSocket']>;
        // });

        // it(`should connect to websocket and send a play message`, async () => {

        //     subject['broadcastAudio']('TestCommand', 'abc123', 'en');

        //     expect(mockWebSocket.onopen).toHaveBeenCalledWith(
        //         expect.stringContaining('!play abc123 en'),
        //     );
        // });
    });
});
