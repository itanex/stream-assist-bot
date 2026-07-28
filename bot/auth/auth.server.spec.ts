import 'reflect-metadata';
import { Container } from 'inversify';
import request from 'supertest';
import winston from 'winston';
import axios from 'axios';
import InjectionTypes from '../../dependency-management/types';
import ChatBot from '../chat-bot';
import AuthenticationServer from './auth.server';
import { addUserFromToken, writeUserTokenToFile, removeUserTokenFile, isUserAuthenticated, getAuthFailureReason } from './authProvider';

jest.mock('axios', () => ({
    __esModule: true,
    default: { post: jest.fn() },
}));
jest.mock('./authProvider', () => ({
    addUserFromToken: jest.fn(),
    writeUserTokenToFile: jest.fn(),
    removeUserTokenFile: jest.fn(),
    isUserAuthenticated: jest.fn(),
    getAuthFailureReason: jest.fn(),
}));
jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        databaseConfig: {
            database: 'test',
            username: 'test',
            password: 'test',
            host: 'localhost',
            port: 5432,
        },
        twitchBot: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            broadcaster: { id: 'test-broadcaster-id' },
            auth: { host: '0.0.0.0', port: 8090 },
        },
    },
}));
jest.mock('../../configurations/required-scopes', () => ({
    __esModule: true,
    default: ['chat:read', 'chat:edit'],
}));

const mockChatBot = {
    configure: jest.fn(),
    start: jest.fn(),
    restart: jest.fn(),
    shutdown: jest.fn(),
};

const mockLogger: winston.Logger = <unknown>{
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as winston.Logger;

describe('AuthenticationServer', () => {
    let authServer: AuthenticationServer;
    // typed as any to avoid supertest/Express.Application incompatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAxiosPost: any;

    beforeEach(() => {
        jest.resetAllMocks();
        // Retrieve the post mock after the factory has run
        mockAxiosPost = axios.post;

        const container = new Container();
        container.bind(ChatBot).toConstantValue(mockChatBot as unknown as ChatBot);
        container.bind<winston.Logger>(InjectionTypes.Logger).toConstantValue(mockLogger);
        container.bind(AuthenticationServer).to(AuthenticationServer);

        authServer = container.get(AuthenticationServer);
        authServer.configure();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        app = (authServer as any).app;
    });

    describe('GET /auth-url', () => {
        it('returns a JSON object containing the Twitch authorize URL', async () => {
            // Arrange - URL is built from mocked environment; no additional setup required

            // Act
            const response = await request(app).get('/auth-url');

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.url).toContain('https://id.twitch.tv/oauth2/authorize');
            expect(response.body.url).toContain('test-client-id');
            expect(response.body.url).toContain('8090');
        });
    });

    describe('GET /index', () => {
        it('responds with the HTML landing page', async () => {
            // Arrange - no setup required

            // Act
            const response = await request(app).get('/index');

            // Assert
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/html/);
        });
    });

    describe('GET /auth', () => {
        const successTokenData = {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            scope: ['chat:read', 'chat:edit'],
            expires_in: 14400,
        };

        it('on successful token exchange: writes token, registers user, starts bot, returns success page', async () => {
            // Arrange
            mockAxiosPost.mockResolvedValue({ data: successTokenData });

            // Act
            const response = await request(app).get('/auth?code=test-auth-code');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authentication Completed Successfully');
            expect(writeUserTokenToFile).toHaveBeenCalledWith(
                'test-broadcaster-id',
                expect.objectContaining({ accessToken: successTokenData.access_token }),
            );
            expect(addUserFromToken).toHaveBeenCalledWith(
                'test-broadcaster-id',
                expect.objectContaining({ accessToken: successTokenData.access_token }),
                ['chat', 'events'],
            );
            expect(mockChatBot.start).toHaveBeenCalledTimes(1);
        });

        it('when token exchange returns no data: returns failure page and does not start bot', async () => {
            // Arrange
            mockAxiosPost.mockResolvedValue({ data: null });

            // Act
            const response = await request(app).get('/auth?code=test-auth-code');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authentication Failed');
            expect(mockChatBot.start).not.toHaveBeenCalled();
        });

        it('when axios throws: returns error page, logs error, and does not start bot', async () => {
            // Arrange
            mockAxiosPost.mockRejectedValue(new Error('Network error'));

            // Act
            const response = await request(app).get('/auth?code=bad-code');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authentication Failed');
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockChatBot.start).not.toHaveBeenCalled();
        });
    });

    describe('GET /revoke', () => {
        it('on successful revocation: removes token file, shuts down bot, returns success page', async () => {
            // Arrange
            mockAxiosPost.mockResolvedValue({});

            // Act
            const response = await request(app).get('/revoke?token=test-token&userId=test-broadcaster-id');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authorization Revoked');
            expect(removeUserTokenFile).toHaveBeenCalledWith('test-broadcaster-id');
            expect(mockChatBot.shutdown).toHaveBeenCalledTimes(1);
        });

        it('when axios throws: returns error page and logs error without shutting down bot', async () => {
            // Arrange
            mockAxiosPost.mockRejectedValue(new Error('Revoke failed'));

            // Act
            const response = await request(app).get('/revoke?token=bad-token');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Revocation Failed');
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockChatBot.shutdown).not.toHaveBeenCalled();
        });
    });

    describe('listen()', () => {
        it('logs the auth URL and failure reason when user is not authenticated', () => {
            // Arrange
            (isUserAuthenticated as jest.Mock).mockReturnValue(false);
            (getAuthFailureReason as jest.Mock).mockReturnValue('No token file found - authorization required');
            const listenSpy = jest.spyOn(app, 'listen').mockImplementation(
                (_port: unknown, _host: unknown, callback?: () => void) => {
                    if (callback) callback();
                    return {} as any;
                },
            );

            // Act
            authServer.listen();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('No token file found - authorization required'),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('/index'),
            );

            listenSpy.mockRestore();
        });

        it('does not log the auth URL when user is already authenticated', () => {
            // Arrange
            (isUserAuthenticated as jest.Mock).mockReturnValue(true);
            const listenSpy = jest.spyOn(app, 'listen').mockImplementation(
                (_port: unknown, _host: unknown, callback?: () => void) => {
                    if (callback) callback();
                    return {} as any;
                },
            );

            // Act
            authServer.listen();

            // Assert
            const authUrlCalls = (mockLogger.info as jest.Mock).mock.calls.filter(
                (call: string[]) => call[0]?.includes('/index'),
            );
            expect(authUrlCalls).toHaveLength(0);

            listenSpy.mockRestore();
        });
    });
});
