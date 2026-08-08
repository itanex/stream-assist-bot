import { ChatUser } from '@twurple/chat';
import winston from 'winston';
import cron from 'node-cron';
import { inject, injectable, multiInject } from 'inversify';
import environment from '../configurations/environment.js';
import { ICommandHandler, SocialsCommand } from './commands/index.js';
import InjectionTypes from '../dependency-management/types.js';
import Broadcaster from './utilities/broadcaster.js';

const command = 'Cron Schedule Job';

@injectable()
export default class Scheduler {
    /**
     * User to use for chat command
     */
    private chatUser: ChatUser;

    private socialsCommand: SocialsCommand;

    /**
     *
     */
    constructor(
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @multiInject(InjectionTypes.CommandHandlers) commandHandlers: ICommandHandler[],
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        this.socialsCommand = commandHandlers.find(x => x.constructor.name === `${SocialsCommand.name}`) as SocialsCommand;

        this.chatUser = <ChatUser>{
            displayName: environment.twitchBot.bot.username,
        };
    }

    async scheduleChatEvents() {
        const socials = cron.schedule(
            '*/30 */1 * * *',
            async () => {
                // Get follower validation
                const broadcaster = await this.broadcaster.getBroadcaster();

                // The returned stream will be `null|undefined` for offline broadcaster
                const isLive = !!(await broadcaster.getStream());

                if (isLive) {
                    await this.socialsCommand.handle(
                        `${environment.twitchBot.channel}`,
                        `${command} - Socials`,
                        this.chatUser,
                        '',
                    );
                }
            },
        );

        await socials.start();

        this.logger.info(`** ${command} - Socials has been scheduled **`);
    }
}
