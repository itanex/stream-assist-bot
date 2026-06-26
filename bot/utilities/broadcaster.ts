import { ApiClient, HelixPrivilegedUser } from '@twurple/api';
import { inject, injectable } from 'inversify';
import environment from '../../configurations/environment';

const cachingTimeout = 5 * 60 * 1000;

@injectable()
export default class Broadcaster {
    private resetOnlineTimer: NodeJS.Timeout | null = null;
    private resetBroadcasterTimer: NodeJS.Timeout | null = null;

    private isLive: boolean = false;
    private broadcaster: HelixPrivilegedUser | null = null;

    constructor(
        @inject(ApiClient) private apiClient: ApiClient,
    ) {
    }

    /**
     * Get the broadcaster info for the configured broadcaster. Caches for a time period defined by `cachingTimeout`
     * @returns The cached value of `broadcaster`
     */
    async getBroadcaster(): Promise<HelixPrivilegedUser> {
        if (!this.resetBroadcasterTimer) {
            this.broadcaster = await this.apiClient.users.getAuthenticatedUser(`${environment.twitchBot.broadcaster.id}`);

            this.resetBroadcasterTimer = setTimeout(() => {
                this.resetBroadcasterTimer = null;
            }, cachingTimeout)
        }

        return this.broadcaster!;
    }

    /**
     * Queries broadcasters streaming state. Caches for a time period defined by `cachingTimeout`
     * @returns The cached value of `isLive`
     */
    async isOnline(): Promise<boolean> {
        if (!this.resetOnlineTimer) {
            const broadcaster = await this.getBroadcaster();

            // The returned stream will be `null|undefined` for offline broadcaster
            this.isLive = !!(await broadcaster.getStream());

            this.resetOnlineTimer = setTimeout(() => {
                this.resetOnlineTimer = null;
            }, cachingTimeout);
        }

        return this.isLive;
    }
}
