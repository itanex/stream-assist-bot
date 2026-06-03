import { AccessToken } from '@twurple/auth';
import axios from 'axios';
import express, { Express } from 'express';
import { inject, injectable } from 'inversify';
import path from 'path';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import environment from '../../configurations/environment';
import requiredScopes from '../../configurations/required-scopes';
import { addUserFromToken, isUserAuthenticated, removeUserTokenFile, writeUserTokenToFile } from './authProvider';
import ChatBot, { IChatBot } from '../chat-bot';

export interface IAuthenticationServer {
    configure(): IAuthenticationServer;
    listen(): IAuthenticationServer;
}

@injectable()
export default class AuthenticationServer implements IAuthenticationServer {
    private app: Express;
    private host: string;
    private port: number;

    constructor(
        @inject(ChatBot) private chatBot: IChatBot,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.host = environment.twitchBot.auth.host;
        this.port = environment.twitchBot.auth.port;
    }

    configure(): IAuthenticationServer {
        const app = express();
        app.use(express.json());

        app.get('/auth', async (req, res) => {
            const { code } = req.query;
            const tokenUrl = `https://id.twitch.tv/oauth2/token`;

            const params = new URLSearchParams();
            params.append('client_id', environment.twitchBot.clientId!);
            params.append('client_secret', environment.twitchBot.clientSecret!);
            params.append('code', `${code}`);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', `http://localhost:${this.port}/auth`);

            const requestConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };

            try {
                const token = await axios.post(tokenUrl, params, requestConfig);

                if (!token.data) {
                    this.logger.error('OAuth token exchange returned no data');
                    res.send(`
                        <html><body>
                        <h1>Authentication Failed</h1>
                        <p>No data was returned from the token exchange. Please try again.</p>
                        <a href="/index">Try Again</a>
                        </body></html>
                    `.trim());
                    return;
                }

                const accessToken: AccessToken = {
                    accessToken: token.data.access_token,
                    refreshToken: token.data.refresh_token,
                    scope: token.data.scope,
                    expiresIn: token.data.expires_in,
                    obtainmentTimestamp: Date.now(),
                };

                writeUserTokenToFile(environment.twitchBot.broadcaster.id!, accessToken);
                addUserFromToken(environment.twitchBot.broadcaster.id!, accessToken, ['chat', 'events']);

                this.chatBot.start();

                const localRevokeUrl = `http://localhost:${this.port}/revoke`
                    + `?userId=${environment.twitchBot.broadcaster.id}`
                    + `&token=${token.data.access_token}`;

                res.send(`
                    <html><body>
                    <h1>Authentication Completed Successfully</h1>
                    <p>The bot is now authorized and connecting to your channel.</p>
                    <a href="${localRevokeUrl}">Revoke Authorization</a>
                    </body></html>
                `.trim());
            } catch (error) {
                this.logger.error(`OAuth token exchange failed: ${error}`);
                res.send(`
                    <html><body>
                    <h1>Authentication Failed</h1>
                    <p>An error occurred during the authorization process. Please try again.</p>
                    <pre>${JSON.stringify(error, null, 2)}</pre>
                    <a href="/index">Try Again</a>
                    </body></html>
                `.trim());
            }
        });

        app.get('/revoke', async (req, res) => {
            const { token } = req.query;
            const revokeUrl = `https://id.twitch.tv/oauth2/revoke`;

            const params = new URLSearchParams();
            params.append('client_id', environment.twitchBot.clientId!);
            params.append('token', `${token}`);

            const requestConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };

            try {
                await axios.post<AccessToken>(revokeUrl, params, requestConfig);

                removeUserTokenFile(environment.twitchBot.broadcaster.id!);
                this.chatBot.shutdown();

                res.send(`
                    <html><body>
                    <h1>Authorization Revoked</h1>
                    <p>The token has been revoked and the bot has been shut down.</p>
                    <a href="/index">Re-authorize</a>
                    </body></html>
                `.trim());
            } catch (error) {
                this.logger.error(`Token revocation failed: ${error}`);
                res.send(`
                    <html><body>
                    <h1>Revocation Failed</h1>
                    <p>The token could not be revoked. It may have already expired.</p>
                    <pre>${JSON.stringify(error, null, 2)}</pre>
                    </body></html>
                `.trim());
            }
        });

        app.get('/auth-url', (req, res) => {
            let authorizeUrl = `https://id.twitch.tv/oauth2/authorize?`;
            authorizeUrl += `client_id=${environment.twitchBot.clientId}`;
            authorizeUrl += `&response_type=code`;
            authorizeUrl += `&force_verify=true`;
            authorizeUrl += `&redirect_uri=http://localhost:${this.port}/auth`;
            authorizeUrl += `&scope=${encodeURI(requiredScopes.join(' '))}`;

            res.json({ url: authorizeUrl });
        });

        app.get('/index', (req, res) => {
            res.sendFile(path.join(__dirname, '/index.html'));
        });

        app.get('/*', (req, res) => {
            res.sendFile(path.join(__dirname, '/index.html'));
        });

        this.app = app;

        return this;
    }

    listen(): IAuthenticationServer {
        this.app.listen(this.port, this.host, () => {
            this.logger.info(`** Auth Web Server is running on http://${this.host}:${this.port}`);

            if (!isUserAuthenticated()) {
                this.logger.info(`Authentication required — visit http://localhost:${this.port}/index to authorize`);
            }
        });

        return this;
    }
}
