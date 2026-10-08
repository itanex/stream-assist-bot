import { ChatClient, ChatUser } from '@twurple/chat';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import calendar from 'dayjs/plugin/calendar.js';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import SubscriberRepository from '../repositories/subscriber.repository.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

dayjs.extend(isToday);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

@injectable()
export class LastSubCommand implements ICommandHandler {
    exp: RegExp = /^!(lastsub)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'lastsub';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(SubscriberRepository) private subscriberRepository: SubscriberRepository,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        await this.subscriberRepository
            .getLastSubscriber()
            .then(async record => {
                const lastDate = dayjs(record!.createdAt).fromNow();

                const variant = record!.type.toLowerCase();
                const commandText = this.commandResponseService
                    .getCommandResponse(this.commandName, variant);

                if (commandText) {
                    const context: TransientContext = {
                        subscriber: record!.subscriber,
                        when: lastDate,
                        gifter: record!.gift?.gifter,
                        giftcount: record!.gift ? `${record!.gift.giftCount}` : undefined,
                    };

                    await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
                } else {
                    this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant });
                }
            });

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName}`);
    }
}
