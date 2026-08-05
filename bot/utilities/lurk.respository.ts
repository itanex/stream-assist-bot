import { inject, injectable } from 'inversify';
import { ChatUser } from '@twurple/chat';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';
import { LurkingUsers } from '../../database';

@injectable()
export default class LurkRespository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    getAllLurkingUsers(): Promise<LurkingUsers[]> {
        return LurkingUsers.getAllLurkingUsers();
    }

    setUserToLurk(userstate: ChatUser): Promise<[LurkingUsers, boolean]> {
        return LurkingUsers.setUserToLurk(userstate);
    }

    async setUserToUnlurk(userstate: ChatUser): Promise<LurkingUsers | null> {
        const [count, records] = await LurkingUsers.setUserToUnlurk(userstate);

        if (count === 1) {
            return records[0];
        }

        return null;
    }

    setAllUsersToUnlurk(): Promise<[number, LurkingUsers[]]> {
        return LurkingUsers.setAllUsersToUnlurk();
    }
}
