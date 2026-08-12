import 'reflect-metadata';
import { jest } from '@jest/globals';
import request from 'supertest';
import { mockLogger } from '../../tests/common.mocks.js';
import { type Environment } from '../../configurations/environment.js';
import { type IChatBot } from '../chat-bot.js';

type AxiosModule = typeof import('axios');
type AuthProviderModule = typeof import('./authProvider.js');
type AuthenticationServerModule = typeof import('./auth.server.js');

jest.unstable_mockModule('axios', () => ({
    __esModule: true,
    default: { post: jest.fn() },
}));

jest.unstable_mockModule('./authProvider', () => ({
    addUserFromToken: jest.fn(),
    writeUserTokenToFile: jest.fn(),
    removeUserTokenFile: jest.fn(),
    isUserAuthenticated: jest.fn(),
    getAuthFailureReason: jest.fn(),
}));

const testScopes = ['test:scope-a', 'test:scope-b'];
jest.unstable_mockModule('../../configurations/required-scopes', () => ({
    __esModule: true,
    default: testScopes,
}));

const mockEnvironment = <unknown>{
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
} as Environment;

const mockChatBot = <unknown>{
    configure: jest.fn(),
    start: jest.fn(),
    restart: jest.fn(),
    shutdown: jest.fn(),
} as jest.Mocked<IChatBot>;

describe('AuthenticationServer', () => {
    let AuthenticationServer: AuthenticationServerModule['default'];

    let subject: InstanceType<AuthenticationServerModule['default']>;

    let mockAxios: jest.Mocked<AxiosModule['default']>;

    let addUserFromToken: AuthProviderModule['addUserFromToken'];
    let writeUserTokenToFile: AuthProviderModule['writeUserTokenToFile'];
    let removeUserTokenFile: AuthProviderModule['removeUserTokenFile'];
    let isUserAuthenticated: AuthProviderModule['isUserAuthenticated'];
    let getAuthFailureReason: AuthProviderModule['getAuthFailureReason'];

    beforeEach(async () => {
        jest.resetModules();
        jest.resetAllMocks();

        ({
            addUserFromToken,
            writeUserTokenToFile,
            removeUserTokenFile,
            isUserAuthenticated,
            getAuthFailureReason,
        } = await import('./authProvider.js'));

        // Retrieve the post mock after the factory has run
        mockAxios = (await import('axios'))
            .default as jest.Mocked<AxiosModule['default']>;

        ({ default: AuthenticationServer } = await import('./auth.server.js'));

        subject = new AuthenticationServer(
            mockChatBot,
            mockEnvironment,
            mockLogger,
        );

        await subject.configure();
    });

    describe('GET /auth-url', () => {
        it('returns a JSON object containing the Twitch authorize URL', async () => {
            // Arrange - URL is built from mocked environment; no additional setup required
            // Act
            const response = await request(subject['app']!).get('/auth-url');

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.url).toContain('https://id.twitch.tv/oauth2/authorize');
            expect(response.body.url).toContain('test-client-id');
            expect(response.body.url).toContain('8090');
            expect(response.body.url).toContain(testScopes[0]);
            expect(response.body.url).toContain(testScopes[1]);
        });
    });

    describe('GET /index', () => {
        it('responds with the HTML landing page', async () => {
            // Arrange - no setup required
            // Act
            const response = await request(subject['app']!).get('/index');

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
            mockAxios
                .post
                .mockResolvedValue({ data: successTokenData });

            // Act
            const response = await request(subject['app']!).get('/auth?code=test-auth-code');

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
            mockAxios
                .post
                .mockResolvedValue({ data: null });

            // Act
            const response = await request(subject['app']!).get('/auth?code=test-auth-code');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authentication Failed');
            expect(mockChatBot.start).not.toHaveBeenCalled();
        });

        it('when axios throws: returns error page, logs error, and does not start bot', async () => {
            // Arrange
            mockAxios
                .post
                .mockRejectedValue(new Error('Network error'));

            // Act
            const response = await request(subject['app']!).get('/auth?code=bad-code');

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
            mockAxios
                .post
                .mockResolvedValue({});

            // Act
            const response = await request(subject['app']!).get('/revoke?token=test-token&userId=test-broadcaster-id');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Authorization Revoked');
            expect(removeUserTokenFile).toHaveBeenCalledWith('test-broadcaster-id');
            expect(mockChatBot.shutdown).toHaveBeenCalledTimes(1);
        });

        it('when axios throws: returns error page and logs error without shutting down bot', async () => {
            // Arrange
            mockAxios
                .post
                .mockRejectedValue(new Error('Revoke failed'));

            // Act
            const response = await request(subject['app']!).get('/revoke?token=bad-token');

            // Assert
            expect(response.status).toBe(200);
            expect(response.text).toContain('Revocation Failed');
            expect(mockLogger.error).toHaveBeenCalled();
            expect(mockChatBot.shutdown).not.toHaveBeenCalled();
        });
    });

    describe('listen()', () => {
        it('logs the auth URL and failure reason when user is not authenticated', async () => {
            // Arrange
            (isUserAuthenticated as jest.Mock).mockReturnValue(false);
            (getAuthFailureReason as jest.Mock).mockReturnValue('No token file found - authorization required');

            /* eslint-disable-next-line */
            const listenSpy = jest.spyOn(subject['app']!, 'listen')
                .mockImplementation((_port: any, _host: any, callback: () => void): any => { callback?.(); return {} as any; });

            // Act
            subject.listen();

            expect(mockLogger.info).toHaveBeenCalledTimes(2);

            expect(mockLogger.info)
                .toHaveBeenCalledWith(
                    expect.stringContaining('Auth Web Server is running'),
                );

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('No token file found - authorization required'),
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Authentication required'),
            );

            listenSpy.mockRestore();
        });

        it('does not log the auth URL when user is already authenticated', async () => {
            // Arrange
            (isUserAuthenticated as jest.Mock).mockReturnValue(true);

            const listenSpy = jest.spyOn(subject['app']!, 'listen')
                .mockImplementation((_port: any, _host: any, callback: () => void): any => { callback?.(); return {} as any; });

            // Act
            subject.listen();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledTimes(1);

            expect(mockLogger.info)
                .toHaveBeenCalledWith(
                    expect.stringContaining('Auth Web Server is running'),
                );

            listenSpy.mockRestore();
        });
    });
});
