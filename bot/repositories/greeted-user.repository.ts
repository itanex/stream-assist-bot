import { inject, injectable } from 'inversify';
import { ChatUser } from '@twurple/chat';
import winston, { stream } from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { GreetUser } from '../../database/index.js';

@injectable()
export default class GreetedUserRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Check the db for user record
     * @param user to find in the database
     * @param streamId to restrict to specific stream
     * @returns existance of record
     */
    async hasUser(user: ChatUser, streamId: string): Promise<boolean> {
        const record = await GreetUser
            .findOne({
                where: {
                    streamId,
                    userId: user.userId,
                },
            });

        return record != null;
    }

    /**
     * Save greeted user to database for the specific stream
     * @param user to save into database
     * @param streamId stream id coorilation key
     */
    async saveUser(user: ChatUser, streamId: string): Promise<GreetUser | null> {
        try {
            return GreetUser
                .create({
                    displayName: user.displayName,
                    userId: user.userId,
                    streamId,
                    greetedAt: new Date(),
                }, {
                    isNewRecord: true,
                    validate: true,
                });
        } catch (error: any) {
            this.logger.error(`Error saving stream start record to database`, error);
        }

        return null;
    }
}
