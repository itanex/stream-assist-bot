import { inject, injectable } from 'inversify';
import winston from 'winston';
import ChatBot from './bot/chat-bot';
import { SAContainer } from './dependency-management/inversify.config';
import { TYPES } from './dependency-management/types';
import Database from './database/database';
import { clearLurkingUsers } from './bot/commands/lurkCommands';

@injectable()
class App {
    constructor(
        @inject(ChatBot) private chatBot: ChatBot,
        @inject(Database) private database: Database,
        @inject(TYPES.Logger) public logger: winston.Logger,
    ) {
        this.logger.info(`** Application initialized **`);
    }

    async main(): Promise<void> {
        this.logger.info(`** Bot application starting **`);

        await Promise.all([
            this.chatBot.start(),
            this.database.connect(),
            this.database.sync(),
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
    .catch(() => {
        application.logger.error('Process Terminated (-1)');
        process.exit(1);
    });

process.on('SIGINT', () => application.exit());
process.on('SIGQUIT', () => application.exit());
process.on('SIGTERM', () => application.exit());
