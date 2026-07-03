import { inject, injectable } from 'inversify';
import Broadcaster from './broadcaster';

@injectable()
export default class StreamStateService {
    private isLive: boolean = false;
    private onlineCallbacks: Array<() => void> = [];
    private offlineCallbacks: Array<() => void> = [];
    private pendingOfflineTimers: NodeJS.Timeout[] = [];

    constructor(
        @inject(Broadcaster) private broadcaster: Broadcaster,
    ) {
    }

    async initialize(): Promise<void> {
        this.isLive = await this.broadcaster.isOnline();
    }

    get isOnline(): boolean {
        return this.isLive;
    }

    setOnline(): void {
        this.isLive = true;

        this.pendingOfflineTimers
            .forEach(x => clearTimeout(x));
        this.pendingOfflineTimers = [];

        this.onlineCallbacks.forEach(fn => fn());
    }

    setOffline(gracePeriodMs = 300_000): void {
        if (!this.isLive) return;

        this.isLive = false;

        this.offlineCallbacks.forEach(fn => {
            this.pendingOfflineTimers
                .push(setTimeout(fn, gracePeriodMs));
        });
    }

    onOnline(fn: () => void): void {
        this.onlineCallbacks.push(fn);
    }

    onOffline(fn: () => void): void {
        this.offlineCallbacks.push(fn);
    }
}
