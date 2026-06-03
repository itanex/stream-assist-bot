import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import fs from 'fs';
import environment from '../../configurations/environment';
import requiredScopes from '../../configurations/required-scopes';
import logger from '../../logger/logger';

fs.mkdirSync('./local-cache', { recursive: true });

const authProvider = new RefreshingAuthProvider({
    clientId: environment.twitchBot.clientId!,
    clientSecret: environment.twitchBot.clientSecret!,
});

let _userAuthenticated = false;

export function isUserAuthenticated(): boolean {
    return _userAuthenticated;
}

/**
 * Reads the token from disk, validates that all required scopes are present,
 * and registers the user with the authProvider.
 * Returns true if the user was successfully added, false otherwise.
 */
export function addUserFromTokenFile(userId: string, intents: string[]): boolean {
    const tokenFilePath = `./local-cache/auth-tokens.${userId}.json`;

    if (!fs.existsSync(tokenFilePath)) {
        logger.error(`Unable to find token file for user: ${userId}`);
        return false;
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8')) as AccessToken;

    const missingScopes = requiredScopes.filter(scope => !tokenData.scope.includes(scope));
    if (missingScopes.length > 0) {
        logger.warn(`Token for user ${userId} is missing required scopes: ${missingScopes.join(', ')} — re-authorization required`);
        return false;
    }

    authProvider.addUser(userId, tokenData, intents);
    return true;
}

/**
 * Registers the user with the authProvider directly from a token object.
 * Used after OAuth flow completes to avoid re-reading the file immediately after writing.
 */
export function addUserFromToken(userId: string, tokenData: AccessToken, intents: string[]): void {
    authProvider.addUser(userId, tokenData, intents);
    _userAuthenticated = true;
}

export function writeUserTokenToFile(userId: string, tokenData: AccessToken): void {
    fs.writeFile(
        `./local-cache/auth-tokens.${userId}.json`,
        JSON.stringify(tokenData, null, 4),
        { encoding: 'utf-8' },
        (err) => {
            if (err) {
                logger.error(`Failed to write token file for user ${userId}: ${err.message}`);
            }
        },
    );
}

export function removeUserTokenFile(userId: string): void {
    authProvider.removeUser(userId);

    fs.rm(
        `./local-cache/auth-tokens.${userId}.json`,
        (err) => {
            if (err) {
                logger.error(`Failed to remove token file for user ${userId}: ${err.message}`);
            }
        },
    );
}

_userAuthenticated = addUserFromTokenFile(environment.twitchBot.broadcaster.id!, ['chat', 'events']);

authProvider.onRefresh(async (userId, newTokenData) => writeUserTokenToFile(userId, newTokenData));

export default authProvider;
