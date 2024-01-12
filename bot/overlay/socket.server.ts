import { inject, injectable } from 'inversify';
import { RawData, Server, WebSocket } from 'ws';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';

/**
 * Used to track connected Web Socket users
 */
type UserRef = {
    ws: WebSocket
};

export interface ISocketServer {
    startServer(): void;
}

/** Web Socket Server */
@injectable()
export default class SocketServer implements ISocketServer {
    /** Instance of the Web Socket server */
    private server: Server;
    /** Configured Web Socket Port */
    private port: number;
    /** Connected Web Socket Users */
    private users: Set<UserRef> = new Set();

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.port = 8080;
    }

    /** Initializes and starts the server */
    startServer(): void {
        this.server = new Server({
            port: this.port,
        }, () => {
            this.logger.info(`** Web Socket Server listening on ${this.port}`);
        });

        this.server.on('connection', ws => {
            const userRef: UserRef = { ws };
            this.users.add(userRef);

            ws.on('message', (rawData: RawData, isBinary: boolean) => {
                try {
                    const data = JSON.parse(rawData.toString());

                    if (
                        typeof data.sender !== 'string'
                        || typeof data.body !== 'string'
                    ) {
                        this.logger.error(`Websocket: Invalid message`);
                        return;
                    }

                    const messageToSend = {
                        sender: data.sender,
                        body: data.body,
                        sentAt: Date.now(),
                    };

                    this.users.forEach(user => {
                        user.ws.send(JSON.stringify(messageToSend));
                    });
                } catch (e) {
                    this.logger.error(`Websocket: Error passing message`, e);
                }
            });

            ws.on('error', (err: Error) => {
                this.logger.error(`Web Socket Error: `, err);
            });

            ws.on('close', (code: number, reason: Buffer) => {
                this.users.delete(userRef);
                this.logger.info(`Web Socket: User Connection closed: ${code} ${reason}`);
            });
        });

        this.server.on('error', (error: Error) => {
            this.logger.error(`Web Socket Error: `, error);
        });
    }
}
