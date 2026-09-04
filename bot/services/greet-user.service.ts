import { ChatUser } from '@twurple/chat';
import { injectable } from 'inversify';

@injectable()
export default class GreetUserService {
    private greetedUsers = new Set<string>();

    constructor() { }

    clear(): void {
        this.greetedUsers.clear();
    }

    hasUser(user: ChatUser): boolean {
        return this.greetedUsers.has(user.userId);
    }

    saveUser(user: ChatUser): void {
        this.greetedUsers.add(user.userId);
    }
}
