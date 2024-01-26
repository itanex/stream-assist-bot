import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler, OnlineState } from './iCommandHandler';

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
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const amount = args[1]
            ? parseInt(args[1])
            : 1;

        const results = this.rollDice(amount, parseInt(args[2]));

        // player.play(sounds.alert);
        this.chatClient.say(channel, `You rolled a ${args[1]}d${args[2]} that resulted in [ ${results.rolls.join(', ')} ] in total ${results.total}`);

        this.logger.info(`* Executed ${commandName} command :: ${JSON.stringify(results)} in ${channel} || ${userstate.displayName} > ${message}`);
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
