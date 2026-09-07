import { ApiClient, HelixPrivilegedUser, HelixStream } from '@twurple/api';
import { inject, injectable } from 'inversify';
import { type Environment } from '../../configurations/environment.js';
import InjectionTypes from '../../dependency-management/types.js';

const cachingTimeout = 5 * 60 * 1000;

@injectable()
export default class Broadcaster {
    private resetOnlineTimer: NodeJS.Timeout | null = null;
    private resetBroadcasterTimer: NodeJS.Timeout | null = null;

    private stream: HelixStream | null = null;
    private broadcaster: HelixPrivilegedUser | null = null;

    constructor(
        @inject(InjectionTypes.Environment) private environment: Environment,
        @inject(ApiClient) private apiClient: ApiClient,
    ) {
    }

    /**
     * Get the broadcaster info for the configured broadcaster. Caches for a time period defined by `cachingTimeout`
     * @returns The cached value of `broadcaster`
     */
    async getBroadcaster(): Promise<HelixPrivilegedUser> {
        if (!this.resetBroadcasterTimer) {
            this.broadcaster = await this.apiClient.users.getAuthenticatedUser(`${this.environment.twitchBot.broadcaster.id}`);

            this.resetBroadcasterTimer = setTimeout(() => {
                this.resetBroadcasterTimer = null;
            }, cachingTimeout);
        }

        return this.broadcaster!;
    }

    /**
     * Queries broadcasters streaming state. Caches for a time period defined by `cachingTimeout`
     * @returns The cached value of `isLive`
     */
    async getStream(): Promise<HelixStream | null> {
        if (!this.resetOnlineTimer) {
            const broadcaster = await this.getBroadcaster();

            // The returned stream will be `null|undefined` for offline broadcaster
            this.stream = await broadcaster.getStream();

            this.resetOnlineTimer = setTimeout(() => {
                this.resetOnlineTimer = null;
            }, cachingTimeout);
        }

        return this.stream;
    }

    /**
     * Queries broadcasters streaming state. Caches for a time period defined by `cachingTimeout`
     * @returns The cached value of `isLive`
     */
    async isOnline(): Promise<boolean> {
        await this.getStream();

        return !!this.stream;
    }
}
