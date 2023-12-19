import { ApiClient, HelixPrivilegedUser, HelixStream } from '@twurple/api';
import { inject, injectable } from 'inversify';
import environment from '../../configurations/environment';

@injectable()
export default class Broadcaster {
    constructor(
        @inject(ApiClient) private apiClient: ApiClient,
    ) {
    }

    /**
     * Get the broadcaster info for the configured broadcaster
     */
    async getBroadcaster(): Promise<HelixPrivilegedUser> {
        return this.apiClient.users.getAuthenticatedUser(environment.broadcasterId);
    }
}
