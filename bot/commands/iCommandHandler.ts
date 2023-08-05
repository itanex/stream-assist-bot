import { ChatUser } from '@twurple/chat';

export default interface ICommandHandler {
    exp: RegExp;
    timeout: number;
    mod: boolean;
    vip: boolean;
    subscriber: boolean;
    follower: boolean;
    viewer: boolean;
    isGlobalCommand: boolean;

    handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
