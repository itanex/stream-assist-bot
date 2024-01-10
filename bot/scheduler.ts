import { ChatUser } from '@twurple/chat';
import cron from 'node-cron';
import { injectable, multiInject } from 'inversify';
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
    ) {
        this.socialsCommand = commandHandlers.find(x => x.constructor.name === `${SocialsCommand.name}`) as SocialsCommand;

        this.chatUser = <ChatUser>{
            displayName: environment.username,
        };
    }

    report() {
        console.log('Scheduler Report: Chat User', this.chatUser);
    }

    trigger() {
        this.socialsCommand.handle(
            environment.channel,
            `${command} - Socials`,
            this.chatUser,
            '',
        );
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

        // const wishlist = cron.schedule(
        //     '8 */1 * * *',
        //     () => onWishListCommand(
        //         environment.channel,
        //         `${command} - WishList/Throne`,
        //         chatUser,
        //         '',
        //     ),
        // );
        // wishlist.start();
    }
}
