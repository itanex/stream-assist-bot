import { ChatUser } from '@twurple/chat';
import winston from 'winston';
import cron from 'node-cron';
import { inject, injectable, multiInject } from 'inversify';
import environment from '../configurations/environment';
import { ICommandHandler, SocialsCommand } from './commands';
import InjectionTypes from '../dependency-management/types';

const command = 'Cron Schedule Job';

@injectable()
export default class Scheduler {
    /**
     * User to use for chat command
     */
    private chatUser: ChatUser = null;

    private socialsCommand: SocialsCommand;

    /**
     *
     */
    constructor(
        @multiInject(InjectionTypes.CommandHandlers) commandHandlers: ICommandHandler[],
        @inject(InjectionTypes.Logger) public logger: winston.Logger,
    ) {
        this.socialsCommand = commandHandlers.find(x => x.constructor.name === `${SocialsCommand.name}`) as SocialsCommand;

        this.chatUser = <ChatUser>{
            displayName: environment.username,
        };
    }

    scheduleChatEvents() {
        const socials = cron.schedule(
            '*/30 */1 * * *',
            () => this.socialsCommand.handle(
                environment.channel,
                `${command} - Socials`,
                this.chatUser,
                '',
            ),
        );

        socials.start();

        this.logger.info(`** ${command} - Socials has been scheduled **`);
    }
}
