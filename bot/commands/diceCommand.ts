import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import { CommandName, TransientContext } from '../utilities/default-responses.js';
import { templateResolver } from '../utilities/template-resolver.js';
import { CommandResponseService } from '../services/index.js';

export type RollResult = {
    rolls: number[];
    total: number;
};

@injectable()
export class DiceCommand implements ICommandHandler {
    exp: RegExp = /!(dice) ((\d?)d(\d{1,3}))/i;
    timeout: number = 5;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'dice';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const amount = args[1]
            ? parseInt(args[1])
            : 1;

        const results = this.rollDice(amount, parseInt(args[2]));

        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, '');

        if (commandText) {
            const context: TransientContext = {
                dice: `${args[1]}d${args[2]}`,
                rolls: results.rolls.join(', '),
                total: `${results.total}`,
            };

            await this.chatClient.say(channel, templateResolver(commandText, context, this.logger));
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
        }

        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}> ${JSON.stringify(results)}`);
    }

    private rollDice(numberOfDice: number, sides: number): RollResult {
        const rolls: number[] = [];
        let total = 0;
        let score = 0;
        let amount = numberOfDice;

        do {
            score = Math.floor(Math.random() * sides) + 1;
            total += score;
            rolls.push(score);
            amount--;
        } while (amount > 0);

        return { rolls, total };
    }
}
