import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import fs from 'fs';
import environment from '../../configurations/environment';

const tokenFilePath = `./local-cache/auth-tokens.${environment.broadcasterId}.json`;
const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8')) as AccessToken;

const authProvider = new RefreshingAuthProvider({
    clientId: environment.clientId,
    clientSecret: environment.clientSecret,
});

authProvider.onRefresh(async (userId, newTokenData) => fs.writeFile(`./local-cache/auth-tokens.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8', null));
authProvider.addUser(environment.broadcasterId, tokenData, ['chat']);

export default authProvider;
