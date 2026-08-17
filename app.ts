import { inject, injectable } from 'inversify';
import winston from 'winston';
import ChatBot, { type IChatBot } from './bot/chat-bot.js';
import SAContainer from './dependency-management/inversify.config.js';
import InjectionTypes from './dependency-management/types.js';
import Database from './database/database.js';
import Scheduler from './bot/scheduler.js';
import { SocketServer, type ISocketServer } from './bot/overlay/socket.server.js';
import OverlayServer, { IOverlayServer } from './bot/overlay/overlay.server.js';
import AuthenticationServer, { IAuthenticationServer } from './bot/auth/auth.server.js';
import { isUserAuthenticated } from './bot/auth/authProvider.js';
import environment from './configurations/environment.js';
import CommandResponseRepository from './bot/repositories/command-response.repository.js';
import pkg from './package.json' with { type: 'json' };

const { name, version } = pkg;

@injectable()
class App {
    constructor(
        @inject(ChatBot) private chatBot: IChatBot,
        @inject(Database) private database: Database,
        @inject(Scheduler) private scheduler: Scheduler,
        @inject(SocketServer) private socketServer: ISocketServer,
        @inject(OverlayServer) private overlayServer: IOverlayServer,
        @inject(AuthenticationServer) private authServer: IAuthenticationServer,
        @inject(CommandResponseRepository) private commandResponseRepository: CommandResponseRepository,
        @inject(InjectionTypes.Logger) public logger: winston.Logger,
    ) {
        this.logger.info(`** Application initialized **`);
    }

    async main(): Promise<void> {
        this.logger.info(`** Bot application starting **`);

        this.chatBot.configure();

        await Promise.all([
            this.database.initialize(),
            this.socketServer.startServer(),
            this.overlayServer.configure(),
            this.authServer.configure(),
            this.scheduler.scheduleChatEvents(),
        ]);

        await this.commandResponseRepository.initialize();

        this.authServer.listen();
        this.overlayServer.listen();

        /* eslint-disable no-console */
        console.log(`\n${name} v${version}`);
        console.log(`  Overlay:   http://${environment.twitchBot.overlay.host}:${environment.twitchBot.overlay.port}`);
        console.log(`  WebSocket: ws://${environment.twitchBot.websocket.host}:${environment.twitchBot.websocket.port}`);
        console.log(`  Auth:      http://${environment.twitchBot.auth.host}:${environment.twitchBot.auth.port}\n`);
        /* eslint-enable no-console */

        if (isUserAuthenticated()) {
            await this.chatBot.start();
        } else {
            this.logger.info('ChatBot is waiting for authorization - complete the OAuth flow and the auth server will start it automatically');
        }
    }

    async exit(): Promise<void> {
        await Promise
            .all([
                this.database.disconnect(),
                this.chatBot.shutdown(),
            ])
            .then(() => {
                this.logger.info('Process Terminated (0)');
                process.exit();
            });
    }
}

SAContainer.bind<App>(App).to(App).inSingletonScope();

const application = SAContainer.get<App>(App);

application.main()
    .catch(reason => {
        const detail = reason instanceof Error ? reason.stack : String(reason);
        application.logger.error(`Process Terminated (-1): ${detail}`);
        process.exit(1);
    });

process.on('SIGINT', () => application.exit());
process.on('SIGQUIT', () => application.exit());
process.on('SIGTERM', () => application.exit());
