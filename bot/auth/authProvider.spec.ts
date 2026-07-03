/* eslint-disable global-require */
import 'reflect-metadata';
import fs from 'fs';

jest.mock('@twurple/auth', () => ({
    __esModule: true,
    RefreshingAuthProvider: jest.fn().mockImplementation(() => ({
        addUser: jest.fn(),
        removeUser: jest.fn(),
        onRefresh: jest.fn(),
    })),
}));

jest.mock('../../logger/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            broadcaster: { id: 'spec-test-broadcaster' },
        },
    },
}));

jest.mock('../../configurations/required-scopes', () => ({
    __esModule: true,
    default: ['chat:read', 'chat:edit'],
}));

const TEST_USER_ID = 'spec-test-123';
const TEST_TOKEN_PATH = `./local-cache/auth-tokens.${TEST_USER_ID}.json`;
const IO_SETTLE_MS = 200;

const validToken = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    scope: ['chat:read', 'chat:edit'],
    expiresIn: 14400,
    obtainmentTimestamp: Date.now(),
};

const waitForIO = () => new Promise(resolve => { setTimeout(resolve, IO_SETTLE_MS); });

describe('authProvider', () => {
    let addUserFromTokenFile: (userId: string, intents: string[]) => boolean;
    let addUserFromToken: (userId: string, tokenData: object, intents: string[]) => void;
    let writeUserTokenToFile: (userId: string, tokenData: object) => void;
    let removeUserTokenFile: (userId: string) => void;
    let isUserAuthenticated: () => boolean;
    let getAuthFailureReason: () => string | null;
    let mockProviderAddUser: jest.Mock;
    let mockProviderRemoveUser: jest.Mock;
    let mockLogger: { info: jest.Mock; error: jest.Mock; warn: jest.Mock };

    beforeEach(() => {
        if (fs.existsSync(TEST_TOKEN_PATH)) {
            fs.rmSync(TEST_TOKEN_PATH);
        }

        jest.resetModules();
        jest.clearAllMocks();

        const module = require('./authProvider');
        addUserFromTokenFile = module.addUserFromTokenFile;
        addUserFromToken = module.addUserFromToken;
        writeUserTokenToFile = module.writeUserTokenToFile;
        removeUserTokenFile = module.removeUserTokenFile;
        isUserAuthenticated = module.isUserAuthenticated;
        getAuthFailureReason = module.getAuthFailureReason;

        const { RefreshingAuthProvider } = require('@twurple/auth');
        // mock.results tracks return values of the constructor; mock.instances tracks `this`,
        // which is not the same as the object returned by mockImplementation
        const lastResult = RefreshingAuthProvider.mock.results[RefreshingAuthProvider.mock.results.length - 1];
        mockProviderAddUser = lastResult?.value?.addUser;
        mockProviderRemoveUser = lastResult?.value?.removeUser;

        mockLogger = require('../../logger/logger').default;
    });

    afterEach(() => {
        if (fs.existsSync(TEST_TOKEN_PATH)) {
            fs.rmSync(TEST_TOKEN_PATH);
        }
    });

    describe('local-cache directory', () => {
        it('is created on module load', () => {
            // Arrange - module loaded in beforeEach; no additional setup required

            // Act - directory creation is a side effect of module load

            // Assert
            expect(fs.existsSync('./local-cache')).toBe(true);
        });
    });

    describe('addUserFromTokenFile', () => {
        it('returns false and logs error when token file does not exist', () => {
            // Arrange - no token file present (cleaned in beforeEach)

            // Act
            const result = addUserFromTokenFile(TEST_USER_ID, ['chat', 'events']);

            // Assert
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(TEST_USER_ID),
            );
            expect(mockProviderAddUser).not.toHaveBeenCalled();
            expect(getAuthFailureReason()).toContain('No token file found');
        });

        it('returns true and calls authProvider.addUser when file exists with all required scopes', () => {
            // Arrange
            fs.writeFileSync(TEST_TOKEN_PATH, JSON.stringify(validToken));

            // Act
            const result = addUserFromTokenFile(TEST_USER_ID, ['chat', 'events']);

            // Assert
            expect(result).toBe(true);
            expect(mockProviderAddUser).toHaveBeenCalledWith(
                TEST_USER_ID,
                expect.objectContaining({ accessToken: validToken.accessToken }),
                ['chat', 'events'],
            );
            expect(mockLogger.error).not.toHaveBeenCalledWith(
                expect.stringContaining(TEST_USER_ID),
            );
        });

        it('returns false and logs warning when token is missing required scopes', () => {
            // Arrange
            const tokenMissingScope = { ...validToken, scope: ['chat:read'] };
            fs.writeFileSync(TEST_TOKEN_PATH, JSON.stringify(tokenMissingScope));

            // Act
            const result = addUserFromTokenFile(TEST_USER_ID, ['chat', 'events']);

            // Assert
            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('chat:edit'),
            );
            expect(mockProviderAddUser).not.toHaveBeenCalled();
            expect(getAuthFailureReason()).toContain('chat:edit');
        });
    });

    describe('addUserFromToken', () => {
        it('registers user with authProvider and flips isUserAuthenticated to true', () => {
            // Arrange
            expect(isUserAuthenticated()).toBe(false);

            // Act
            addUserFromToken(TEST_USER_ID, validToken, ['chat', 'events']);

            // Assert
            expect(isUserAuthenticated()).toBe(true);
            expect(getAuthFailureReason()).toBeNull();
            expect(mockProviderAddUser).toHaveBeenCalledWith(TEST_USER_ID, validToken, ['chat', 'events']);
        });
    });

    describe('writeUserTokenToFile', () => {
        it('writes the token to the correct path on disk', async () => {
            // Arrange - no pre-existing file

            // Act
            writeUserTokenToFile(TEST_USER_ID, validToken);
            await waitForIO();

            // Assert
            expect(fs.existsSync(TEST_TOKEN_PATH)).toBe(true);
            const written = JSON.parse(fs.readFileSync(TEST_TOKEN_PATH, 'utf-8'));
            expect(written.accessToken).toBe(validToken.accessToken);
            expect(written.scope).toEqual(validToken.scope);
        });
    });

    describe('writeUserTokenToFile → addUserFromTokenFile roundtrip', () => {
        it('token written to disk is correctly read back by addUserFromTokenFile', async () => {
            // Arrange - write via the production function
            writeUserTokenToFile(TEST_USER_ID, validToken);
            await waitForIO();

            // Act
            const result = addUserFromTokenFile(TEST_USER_ID, ['chat', 'events']);

            // Assert
            expect(result).toBe(true);
            expect(mockProviderAddUser).toHaveBeenCalledWith(
                TEST_USER_ID,
                expect.objectContaining({ accessToken: validToken.accessToken }),
                ['chat', 'events'],
            );
        });
    });

    describe('removeUserTokenFile', () => {
        it('deletes the token file from disk and removes user from authProvider', async () => {
            // Arrange
            fs.writeFileSync(TEST_TOKEN_PATH, JSON.stringify(validToken));
            expect(fs.existsSync(TEST_TOKEN_PATH)).toBe(true);

            // Act
            removeUserTokenFile(TEST_USER_ID);
            await waitForIO();

            // Assert
            expect(fs.existsSync(TEST_TOKEN_PATH)).toBe(false);
            expect(mockProviderRemoveUser).toHaveBeenCalledWith(TEST_USER_ID);
        });

        it('logs error when the token file does not exist', async () => {
            // Arrange - no file present (cleaned in beforeEach)

            // Act
            removeUserTokenFile(TEST_USER_ID);
            await waitForIO();

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(TEST_USER_ID),
            );
        });
    });
});
