import http, { IncomingMessage, Server, ServerResponse } from 'http';
import fs from 'fs';
import { inject, injectable } from 'inversify';
import path from 'path';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import environment from '../../configurations/environment';

export interface IOverlayServer {
    configure(): IOverlayServer;
    listen(): IOverlayServer;
}

@injectable()
export default class OverlayServer implements IOverlayServer {
    private server: Server;
    /** Configured Web Host */
    private host: string;
    /** Configured Web Port */
    private port: number;
    private rootPath = `local-cache/audio/8ball`;

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.host = environment.twitchBot.overlay.host;
        this.port = environment.twitchBot.overlay.port + 1;
    }

    configure(): IOverlayServer {
        const requestListener = (req: IncomingMessage, res: ServerResponse) => {
            let result: any = null;
            try {
                // eslint-disable-next-line no-cond-assign
                if (result = req.url.match(/\/audio\/([a-f0-9]{32}\.[a-z]{2})/)) {
                    const filePath = path.resolve(process.cwd(), this.rootPath, `${result[1]}.mp3`);

                    if (fs.existsSync(filePath)) {
                        res.setHeader('Content-Type', 'audio/mp3');
                        res.statusCode = 200;
                        res.end(fs.readFileSync(filePath));
                        return;
                    }

                    res.statusCode = 404;
                    res.end();

                    // eslint-disable-next-line no-cond-assign
                } else if (result = req.url.match(/([a-z0-9\\.]{1,32}.css)/)) {
                    res.setHeader('Content-Type', 'text/css');
                    res.statusCode = 200;
                    res.end(fs.readFileSync(`${__dirname}/${result[1]}`));
                    // eslint-disable-next-line no-cond-assign
                } else if (result = req.url.match(/([a-z0-9\\.]{1,32}.js)/)) {
                    res.setHeader('Content-Type', 'text/js');
                    res.statusCode = 200;
                    res.end(fs.readFileSync(`${__dirname}/${result[1]}`));
                } else {
                    res.setHeader('Content-Type', 'text/html');
                    res.statusCode = 200;
                    res.end(fs.readFileSync(`${__dirname}/index.html`));
                }
            } catch (e) {
                this.logger.error(`** Overlay Web Server: Request Handling error`, e);
                res.statusCode = 500;
                res.end();
            }
        };

        this.server = http.createServer(requestListener);

        return this;
    }

    listen(): IOverlayServer {
        this.server.listen(this.port, this.host, () => {
            this.logger.info(`** Overlay Web Server is running on http://${this.host}:${this.port}`);
        });

        return this;
    }
}
