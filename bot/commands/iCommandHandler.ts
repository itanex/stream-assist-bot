/* eslint-disable no-extra-semi */
/* eslint-disable semi */
import { ChatUser } from '@twurple/chat';

/** Represents the restriction state */
export type OnlineState = 'always' | 'online' | 'offline';

export interface ICommandHandler {
    /** Regular Expression to identify command */
    exp: RegExp;
    /** The timeout in seconds for this command */
    timeout: number;
    mod: boolean;
    vip: boolean;
    subscriber: boolean;
    follower: boolean;
    viewer: boolean;
    isGlobalCommand: boolean;
    /** Command execution restricted by online state */
    restriction: OnlineState;

    handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
