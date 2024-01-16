import { AccessToken, RefreshingAuthProvider } from '@twurple/auth';
import fs from 'fs';
import environment from '../../configurations/environment';

const tokenFilePath = `./local-cache/auth-tokens.${environment.twitchBot.broadcaster.id}.json`;
const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, 'utf-8')) as AccessToken;

const authProvider = new RefreshingAuthProvider({
    clientId: environment.twitchBot.clientId,
    clientSecret: environment.twitchBot.clientSecret,
});

authProvider.onRefresh(async (userId, newTokenData) => fs.writeFile(
    `./local-cache/auth-tokens.${userId}.json`,
    JSON.stringify(newTokenData, null, 4),
    { encoding: 'utf-8' },
    () => '',
));
authProvider.addUser(environment.twitchBot.broadcaster.id, tokenData, ['chat']);

export default authProvider;
