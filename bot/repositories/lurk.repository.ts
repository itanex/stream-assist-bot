import { inject, injectable } from 'inversify';
import { ChatUser } from '@twurple/chat';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { LurkingUserDbo } from '../../database/index.js';

@injectable()
export default class LurkRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async getAllLurkingUsers(): Promise<LurkingUserDbo[]> {
        return LurkingUserDbo
            .findAll({
                where: { endTime: null },
                order: [['createdAt', 'DESC']],
            });
    }

    setUserToLurk(user: ChatUser): Promise<[LurkingUserDbo, boolean]> {
        return LurkingUserDbo
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

    async setUserToUnlurk(user: ChatUser): Promise<LurkingUserDbo | null> {
        const [count, records] = await LurkingUserDbo
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

    setAllUsersToUnlurk(endDate?: Date): Promise<[number, LurkingUserDbo[]]> {
        return LurkingUserDbo
            .update(
                { endTime: endDate ?? new Date() },
                {
                    where: { endTime: null },
                    returning: true,
                },
            );
    }
}
