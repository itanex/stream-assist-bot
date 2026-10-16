import { inject, injectable } from 'inversify';
import { ChatUser } from '@twurple/chat';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { LurkingUsers } from '../../database/index.js';

@injectable()
export default class LurkRespository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async getAllLurkingUsers(): Promise<LurkingUsers[]> {
        return LurkingUsers
            .findAll({
                where: { endTime: null },
                order: [['createdAt', 'DESC']],
            });
    }

    setUserToLurk(user: ChatUser): Promise<[LurkingUsers, boolean]> {
        return LurkingUsers
            .findOrCreate({
                where: {
                    userId: user.userId,
                    endTime: null,
                },
                order: [['createdAt', 'DESC']],
                defaults: {
                    displayName: user.displayName,
                    userId: user.userId,
                    startTime: new Date(),
                },
            });
    }

    async setUserToUnlurk(user: ChatUser): Promise<LurkingUsers | null> {
        const [count, records] = await LurkingUsers
            .update(
                { endTime: new Date() },
                {
                    where: {
                        displayName: user.displayName,
                        userId: user.userId,
                        endTime: null,
                    },
                    returning: true,
                },
            );

        if (count === 1) {
            return records[0];
        }

        return null;
    }

    setAllUsersToUnlurk(endDate?: Date): Promise<[number, LurkingUsers[]]> {
        return LurkingUsers
            .update(
                { endTime: endDate ?? new Date() },
                {
                    where: { endTime: null },
                    returning: true,
                },
            );
    }
}
