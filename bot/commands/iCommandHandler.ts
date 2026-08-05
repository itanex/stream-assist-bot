/* eslint-disable no-extra-semi */
/* eslint-disable semi */
import { ChatUser } from '@twurple/chat';
import { CommandName } from '../utilities/default-responses';

/** Represents the restriction state */
export type OnlineState = 'always' | 'online' | 'offline';

export interface ICommandHandler {
    /** Regular Expression to identify command */
    exp: RegExp;
    /** Used to identify command in database */
    commandName?: CommandName;
    /** The timeout in seconds for this command */
    timeout: number;
    mod: boolean;
    vip: boolean;
    artist: boolean;
    founder: boolean;
    subscriber: boolean;
    follower: boolean;
    viewer: boolean;
    isGlobalCommand: boolean;
    /** Command execution restricted by online state */
    restriction: OnlineState;
    /** CooldownKey */
    cooldownKey?(args: string[]): string;

    handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any, resolvedChannel?: string): Promise<void>;
}
