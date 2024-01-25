import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable, multiInject } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from '../commands';
import { CommandTimeout } from '../types/CommandTimeout';
import Broadcaster from '../utilities/broadcaster';

@injectable()
export class MessageHandler {
    private readonly globalTimeouts: CommandTimeout[] = [];
    /**
     *
     */
    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @multiInject(InjectionTypes.CommandHandlers) private commandHandlers: ICommandHandler[],
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, user: string, message: string, chatUser: ChatUser): Promise<void> {
        // Find command to execute
        const { commandHandler, commandArguments } = this.parseCommand(message);

        if (!commandHandler) { return; }

        const instruction = commandHandler.constructor.name;
        const broadcaster = await this.broadcaster.getBroadcaster();

        // The returned stream will be `null|undefined` for offline broadcaster
        const isLive = !!(await broadcaster.getStream());

        if (!this.canExecute(commandHandler, isLive)) {
            return;
        }

        // Get follower validation
        const isFollower = await broadcaster.isFollowedBy(chatUser.userId);

        if (!this.isAuthorized(chatUser, isFollower, commandHandler)) {
            return;
        }

        // if (commandHandler.isGlobalCommand) {
        // manageCommandTimeout(command, globalTimeouts, instruction, msg.userInfo, cmd, channel);
        const index = this.globalTimeouts.findIndex(value => value.name === instruction);

        if (index > -1) {
            const ttl = Math.ceil(Math.abs(this.globalTimeouts[index].timeout - new Date().getTime()) / 1000);
            const period = this.timeoutPeriod(chatUser, commandHandler);

            if (ttl < period) {
                this.onCommandCooldown(instruction, channel, period - ttl);
                return;
            }

            this.globalTimeouts.splice(index, 1);
        }

        this.globalTimeouts.push({ name: instruction, timeout: new Date().getTime() });
        // } else {
        //     // manageCommandTimeout(command, userTimeouts[msg.userInfo.userId] ?? [], instruction, msg.userInfo, cmd, channel);
        //     const userCommands = userTimeouts[msg.userInfo.userId];

        //     const index = userCommands.findIndex(value => value.name === instruction);

        //     if (index > -1) {
        //         const ttl = Math.ceil(Math.abs(userCommands[index].timeout - new Date().getTime()) / 1000);
        //         const period = timeoutPeriod(msg.userInfo, command);

        //         if (ttl < period) {
        //             return onCommandCooldown(cmd, channel, period - ttl);
        //         }

        //         userCommands.splice(index, 1);
        //     }

        //     userTimeouts[msg.userInfo.userId].push({ name: instruction, timeout: new Date().getTime() });
        // }

        commandHandler.handle(channel, instruction, chatUser, message, commandArguments);
    }

    private parseCommand(message: string) {
        let commandArguments: string[];

        const commandHandler = this.commandHandlers.find(x => {
            const result = message.trim().match(x.exp);

            if (result) {
                // extract command arguments
                const [raw, ...[cmd, ...args]] = result;
                commandArguments = args;
            }

            return result;
        });

        return { commandHandler, commandArguments };
    }

    private canExecute(commandHandler: ICommandHandler, isLive: boolean): boolean {
        switch (commandHandler.restriction) {
            case 'online':
                return isLive;
            case 'offline':
                return !isLive;
            default:
                return true;
        }
    }

    private async isAuthorized(user: ChatUser, isFollower: boolean, command: ICommandHandler): Promise<boolean> {
        if (command.viewer) {
            return true;
        }

        if (user.isBroadcaster) {
            return true;
        }

        if (user.isMod && command.mod) {
            return true;
        }

        if (user.isSubscriber && command.subscriber) {
            return true;
        }

        if (user.isVip && command.vip) {
            return true;
        }

        return isFollower;
    }

    private timeoutPeriod(user: ChatUser, command: ICommandHandler): number {
        if (user.isBroadcaster) {
            return 0;
        }

        return user.isFounder || user.isMod || user.isSubscriber || user.isVip
            ? command.timeout / 2
            : command.timeout;
    }

    private onCommandCooldown(instruction: string, channel: string, ttl: number): void {
        this.chatClient.say(channel, `Sorry, the "${instruction}" command is still on cooldown. It will be ready in ${ttl} second(s)`);
    }
}
