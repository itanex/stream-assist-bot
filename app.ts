import { inject, injectable } from 'inversify';
import winston from 'winston';
import ChatBot from './bot/chat-bot';
import SAContainer from './dependency-management/inversify.config';
import InjectionTypes from './dependency-management/types';
import Database from './database/database';
import { clearLurkingUsers } from './bot/commands/lurkCommands';
import Scheduler from './bot/scheduler';
import SocketServer, { ISocketServer } from './bot/overlay/socket.server';

@injectable()
class App {
    constructor(
        @inject(ChatBot) private chatBot: ChatBot,
        @inject(Database) private database: Database,
        @inject(Scheduler) private scheduler: Scheduler,
        @inject(SocketServer) private socketServer: ISocketServer,
        @inject(InjectionTypes.Logger) public logger: winston.Logger,
    ) {
        this.logger.info(`** Application initialized **`);
    }

    async main(): Promise<void> {
        this.logger.info(`** Bot application starting **`);

        await Promise.all([
            this.chatBot.start(),
            this.database.connect(),
            this.database.sync(),
            this.socketServer.startServer(),
            this.scheduler.scheduleChatEvents(),
        ]);
    }

    async exit(): Promise<void> {
        await clearLurkingUsers(this.logger)
            .then(async () => {
                await Promise
                    .all([
                        this.database.disconnect(),
                        this.chatBot.shutdown(),
                    ])
                    .then(() => {
                        this.logger.info('Process Terminated (0)');
                        process.exit();
                    });
            });
    }
}

SAContainer.bind<App>(App).to(App).inSingletonScope();

const application = SAContainer.get<App>(App);

application.main()
    .catch(reason => {
        application.logger.error(`Process Terminated (-1): ${reason}`);
        process.exit(1);
    });

process.on('SIGINT', () => application.exit());
process.on('SIGQUIT', () => application.exit());
process.on('SIGTERM', () => application.exit());
