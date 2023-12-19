import { inject, injectable } from 'inversify';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types';

export interface IFollowStreamEvent {
    handle(channel: string, username: string): Promise<void>;
}

@injectable()
export class FollowHandler implements IFollowStreamEvent {
    /**
     *
     */
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger
    ) {
    }

    async handle(channel: string, username: string): Promise<void> {
        this.logger.info(`* Executed Raid Handler :: "${username}" joined "${channel}"`);
    }
}