import { ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import { GreetedUserRepository } from '../repositories/index.js';
import Broadcaster from '../utilities/broadcaster.js';

@injectable()
export default class GreetUserService {
    private greetedUsers = new Set<string>();

    constructor(
        @inject(Broadcaster) private broadcaster: Broadcaster,
        @inject(GreetedUserRepository) private greetedUserRepository: GreetedUserRepository,
    ) { }

    clear(): void {
        this.greetedUsers.clear();
    }

    async hasUser(user: ChatUser): Promise<boolean> {
        const stream = await this.broadcaster.getStream();

        // only report user exists if we are online (stream != null)
        if (stream) {
            const cached = this.greetedUsers.has(user.userId);
            const record = await this.greetedUserRepository.hasUser(user, stream.id);

            // if the user was not part of the cache but is in the DB
            if (!cached && record) {
                this.greetedUsers.add(user.userId);
                return true;
            }

            return cached && record;
        }

        return false;
    }

    async saveUser(user: ChatUser): Promise<void> {
        const stream = await this.broadcaster.getStream();

        // only save user records if we are online (stream != null)
        if (stream) {
            this.greetedUsers.add(user.userId);

            await this.greetedUserRepository.saveUser(user, stream.id);
        }
    }
}
