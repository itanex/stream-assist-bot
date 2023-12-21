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
        // Remove whitespace from chat message
        const inputCommand = message.trim();

        // Get follower validation
        const broadcaster = await this.broadcaster.getBroadcaster();
        const isFollower = await broadcaster.isFollowedBy(chatUser.userId);

        // find command in list
        for (const command of this.commandHandlers) {
            const commandFrags = inputCommand.match(command.exp);

            if (!this.isAuthorized(chatUser, isFollower, command)) {
                continue;
            }

            // only address found commands
            if (commandFrags) {
                // destructure parsed command to provisional components
                const [raw, ...[cmd, ...args]] = commandFrags;
                const instruction = `${command.exp}`;

                // if (command.isGlobalCommand) {
                // manageCommandTimeout(command, globalTimeouts, instruction, msg.userInfo, cmd, channel);
                const index = this.globalTimeouts.findIndex(value => value.name === instruction);

                if (index > -1) {
                    const ttl = Math.ceil(Math.abs(this.globalTimeouts[index].timeout - new Date().getTime()) / 1000);
                    const period = this.timeoutPeriod(chatUser, command);

                    if (ttl < period) {
                        this.onCommandCooldown(cmd, channel, period - ttl);
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

                command.handle(channel, raw, chatUser, message, args);
                return;
            }
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
