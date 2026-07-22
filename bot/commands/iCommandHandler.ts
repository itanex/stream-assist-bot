/* eslint-disable no-extra-semi */
/* eslint-disable semi */
import { ChatUser } from '@twurple/chat';
import { PhraseKey } from '../utilities/default-phrases';

/** Represents the restriction state */
export type OnlineState = 'always' | 'online' | 'offline';

export interface ICommandHandler {
    /** Regular Expression to identify command */
    exp: RegExp;
    /** Used to identify command in database */
    phraseKey?: PhraseKey;
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

    handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
