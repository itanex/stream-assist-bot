import { inject, injectable } from 'inversify';
import winston from 'winston';
import ChatBot from './bot/chat-bot';
import { SAContainer } from './dependency-management/inversify.config';
import { TYPES } from './dependency-management/types';
import Database from './database/database';

@injectable()
class App {
    constructor(
        @inject(ChatBot) private chatBot: ChatBot,
        @inject(Database) private database: Database,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        this.logger.info(`** Application initialized **`);
    }

    async main(): Promise<void> {
        this.logger.info(`** Bot application starting **`);
        this.chatBot.start();
        this.database.connect();
    }

    async exit(): Promise<void> {
        Promise.all([])
            .then(() => {
                this.logger.info('Process Terminated');
                process.exit();
            });
    }
}

SAContainer.bind<App>(App).toSelf().inSingletonScope();

const application = SAContainer.get<App>(App);

application.main()
    .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Error:', err);
        process.exit(1);
    });
