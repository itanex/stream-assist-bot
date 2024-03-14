import { AccessToken } from '@twurple/auth';
import axios from 'axios';
import express, { Express } from 'express';
import { inject, injectable } from 'inversify';
import path from 'path';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import environment from '../../configurations/environment';
import requiredScopes from '../../configurations/required-scopes';
import { addUserFromTokenFile, removeUserTokenFile, writeUserTokenToFile } from './authProvider';
import ChatBot, { IChatBot } from '../chat-bot';

export interface IAuthenticationServer {
    configure(): IAuthenticationServer;
    listen(): IAuthenticationServer;
}

@injectable()
export default class AuthenticationServer implements IAuthenticationServer {
    private app: Express;
    /** Configured Web Host */
    private host: string;
    /** Configured Web Port */
    private port: number;

    constructor(
        @inject(ChatBot) private chatBot: IChatBot,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.host = '0.0.0.0';
        this.port = 8090;
    }

    configure(): IAuthenticationServer {
        const app = express();
        app.use(express.json());

        app.get('/auth', (req, res) => {
            const { code } = req.query;
            const tokenUrl = `https://id.twitch.tv/oauth2/token`;

            const params = new URLSearchParams();
            params.append('client_id', environment.twitchBot.clientId);
            params.append('client_secret', environment.twitchBot.clientSecret);
            params.append('code', `${code}`);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', `http://localhost:${this.port}/auth`);

            const requestConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };

            axios.post(tokenUrl, params, requestConfig).then(
                token => {
                    if (token.data) {
                        const accessToken: AccessToken = {
                            accessToken: token.data.access_token,
                            refreshToken: token.data.refresh_token,
                            scope: token.data.scope,
                            expiresIn: token.data.expires_in,
                            obtainmentTimestamp: Date.now(),
                        };

                        writeUserTokenToFile(
                            environment.twitchBot.broadcaster.id,
                            accessToken,
                        );

                        setTimeout(() => {
                            addUserFromTokenFile(environment.twitchBot.broadcaster.id, ['chat']);
                            setTimeout(() => this.chatBot.start(), 1000);
                        }, 1000);

                        let localRevokeUrl = `http://localhost:${this.port}/revoke`;
                        localRevokeUrl += `?userId=${environment.twitchBot.broadcaster.id}`;
                        localRevokeUrl += `&token=${token.data.access_token}`;

                        res.send(`
                        <html>
                        <body>
                        <h1>Authentication Completed Successfully</h1>
                        <p>Split Personality has been enabled on your channel</p>
                        <textarea>
                        ${JSON.stringify(token.data, null, 2)}</pre>
                        </textarea>
                        <pre>Token: ${token.data.access_token}</pre>
                        <a href="${localRevokeUrl}">revoke</a>
                        </body>
                        `.trim());
                    } else {
                        res.send(`
                        <html>
                        <body>
                        <h1>Authentication Failed</h1>
                        <p>There was an error processing the authentication request. No data was found in the token</p>
                        </body>
                        `.trim());
                    }
                },
                reason => {
                    res.send(`
                    <html>
                    <body>
                    <h1>Authentication Failed</h1>
                    <p>There was an error processing the authentication request</p>
                    <pre>${JSON.stringify(reason, null, 2)}</pre>
                    </body>
                    `.trim());
                },
            );
        });

        app.get('/revoke', (req, res) => {
            const { token } = req.query;
            const revokeUrl = `https://id.twitch.tv/oauth2/revoke`;

            const params = new URLSearchParams();
            params.append('client_id', environment.twitchBot.clientId);
            params.append('token', `${token}`);

            const requestConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };

            axios.post<AccessToken>(revokeUrl, params, requestConfig)
                .then(
                    () => {
                        removeUserTokenFile(environment.twitchBot.broadcaster.id);

                        this.chatBot.shutdown();

                        res.send(`
                        <html>
                        <body>
                        <h1>Authentication Token Revoke</h1>
                        <p>The revocation of the token was completed successfully</p>
                        <pre>Token: ${token}</p>
                        </body>
                        `.trim());
                    },
                    reason => {
                        res.send(`
                        <html>
                        <body>
                        <h1>Authentication Token Revoke</h1>
                        <p>The revocation of the token was not completed successfully</p>
                        <pre>Token: ${token}</p>
                        <pre>${JSON.stringify(reason, null, 2)}</pre>
                        </body>
                        `.trim());
                    },
                );
        });

        app.get('/index', (req, res) => {
            let authorizeUrl = `https://id.twitch.tv/oauth2/authorize?`;
            authorizeUrl += `client_id=${environment.twitchBot.clientId}`;
            authorizeUrl += `&response_type=code`;
            authorizeUrl += `&force_verify=true`;
            authorizeUrl += `&redirect_uri=http://localhost:${this.port}/auth`;
            authorizeUrl += `&scope=${encodeURI(requiredScopes.join(' '))}`;

            res.send(`
            <html>
            <body>
            <h1>Authentication Setup</h1>
            <p>To use this bot you need to authorize the application</p>
            <a href="${authorizeUrl}">Authorize Application</a>
            </body>
            `.trim());
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
        });

        return this;
    }
}
