import { AccessToken, RefreshingAuthProvider, exchangeCode } from '@twurple/auth';
import fs from 'fs';
import environment from '../../configurations/environment';
import requiredScopes from '../../configurations/required-scopes';

const authProvider = new RefreshingAuthProvider({
    clientId: environment.twitchBot.clientId,
    clientSecret: environment.twitchBot.clientSecret,
});

/**
 * Fetches the access token from the filesystem and adds that user to the authProvider
 * @param userId User Id to load the token for
 */
export function addUserFromTokenFile(userId: string, intents: string[]): void {
    const tokenFilePath = `./local-cache/auth-tokens.${userId}.json`;

    if (fs.existsSync(tokenFilePath)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8')) as AccessToken;
        authProvider.addUser(userId, tokenData, intents);
    } else {
        console.error(`CONSOLE: Unable to find token file for user: ${userId}`);
    }
}

export function writeUserTokenToFile(userId: string, tokenData: AccessToken): void {
    fs.writeFile(
        `./local-cache/auth-tokens.${userId}.json`,
        JSON.stringify(tokenData, null, 4),
        { encoding: 'utf-8' },
        () => '',
    );
}

export function removeUserTokenFile(userId: string): void {
    authProvider.removeUser(userId);

    fs.rm(
        `./local-cache/auth-tokens.${userId}.json`,
        () => '',
    );
}

addUserFromTokenFile(environment.twitchBot.broadcaster.id, ['chat']);
// authProvider.addUser(environment.twitchBot.broadcaster.id, { scope: requiredScopes } as AccessToken, ['chat']);

authProvider.onRefresh(async (userId, newTokenData) => writeUserTokenToFile(userId, newTokenData));

// exchangeCode(environment.twitchBot.clientId, environment.twitchBot.clientSecret,)

export default authProvider;
