import { ApiClient, HelixPrivilegedUser } from '@twurple/api';
import { inject, injectable } from 'inversify';
// import winston from 'winston';

@injectable()
export class Broadcaster {
    constructor(
        @inject(ApiClient) private apiClient: ApiClient,
        // @inject(TYPES.Logger) private logger: winston.Logger
    ) {

    }

    async getBroadcaster(): Promise<HelixPrivilegedUser> {
        return this.apiClient.users.getMe();
    }
}
