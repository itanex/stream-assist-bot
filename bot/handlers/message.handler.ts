import { ApiClient } from '@twurple/api';
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable, multiInject } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { ICommandHandler } from '../commands/index.js';
import { CommandTimeout } from '../types/CommandTimeout.js';
import Broadcaster from '../utilities/broadcaster.js';
import StreamStateService from '../utilities/stream-state.service.js';

type ParsedCommand = {
    commandHandler: ICommandHandler | undefined,
    commandArguments: string[]
}

@injectable()
export class MessageHandler {
    private readonly globalTimeouts: CommandTimeout[] = [];

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(ApiClient) private apiClient: ApiClient,
        @multiInject(InjectionTypes.CommandHandlers) private commandHandlers: ICommandHandler[],
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(StreamStateService) private streamStateService: StreamStateService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, user: string, message: string, chatUser: ChatUser, sourceChannelId?: string | null): Promise<void> {
        // Find command to execute
        const { commandHandler, commandArguments } = this.parseCommand(message);

        if (!commandHandler) { return; }

        const instruction = commandHandler.constructor.name;
        const cooldownBucketKey = commandHandler.cooldownKey?.(commandArguments) ?? instruction;
        const broadcaster = await this.broadcaster.getBroadcaster();

        if (!this.canExecute(commandHandler, this.streamStateService.isOnline)) {
            return;
        }

        // Get follower validation
        const isFollower = await broadcaster.isFollowedBy(chatUser.userId);

        if (!this.isAuthorized(chatUser, isFollower, commandHandler)) {
            return;
        }

        // if (commandHandler.isGlobalCommand) {
        // manageCommandTimeout(command, globalTimeouts, instruction, msg.userInfo, cmd, channel);
        const index = this.globalTimeouts.findIndex(value => value.name === cooldownBucketKey);

        if (index > -1) {
            const ttl = Math.ceil(Math.abs(this.globalTimeouts[index].timeout - new Date().getTime()) / 1000);
            const period = this.timeoutPeriod(chatUser, commandHandler);

            if (ttl < period) {
                await this.onCommandCooldown(instruction, channel, period - ttl);
                return;
            }

            this.globalTimeouts.splice(index, 1);
        }

        this.globalTimeouts.push({ name: cooldownBucketKey, timeout: new Date().getTime() });
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

        // Lazy: only hits the API if a command actually calls it. Prefers the message's
        // originating channel (shared-chat sessions); falls back to this bot's home channel.
        const resolveChannel = async (): Promise<string> => {
            if (sourceChannelId) {
                const result = await this.apiClient.users.getUserById(sourceChannelId);
                return result?.displayName ?? broadcaster.displayName;
            }

            return broadcaster.displayName;
        };

        await commandHandler
            .handle(channel, instruction, chatUser, message, commandArguments, resolveChannel)
            .catch((reason: any) => {
                this.logger.error(`* Executed Message Handler :: ${message}`, { channel, user, chatUser, reason });
            });
    }

    private parseCommand(message: string): ParsedCommand {
        let commandArguments: string[] = [];

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

    private isAuthorized(user: ChatUser, isFollower: boolean, command: ICommandHandler): boolean {
        if (command.viewer) {
            return true;
        }

        if (user.isBroadcaster) {
            return true;
        }

        if (command.leadMod && user.isLeadMod) {
            return true;
        }

        if (command.mod && (user.isMod || user.isLeadMod)) {
            return true;
        }

        if (command.vip && user.isVip) {
            return true;
        }

        if (command.artist && user.isArtist) {
            return true;
        }

        if (command.founder && user.isFounder) {
            return true;
        }

        if (command.subscriber && user.isSubscriber) {
            return true;
        }

        return command.follower && (isFollower || user.isSubscriber);
    }

    private timeoutPeriod(user: ChatUser, command: ICommandHandler): number {
        if (user.isBroadcaster) {
            return 0;
        }

        return user.isFounder || user.isMod || user.isSubscriber || user.isVip || user.isArtist
            ? command.timeout / 2
            : command.timeout;
    }

    private async onCommandCooldown(instruction: string, channel: string, ttl: number): Promise<void> {
        await this.chatClient.say(channel, `Sorry, the "${instruction}" command is still on cooldown. It will be ready in ${ttl} second(s)`);
    }
}
