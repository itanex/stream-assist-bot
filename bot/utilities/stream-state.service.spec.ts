import 'reflect-metadata';
import StreamStateService from './stream-state.service';
import Broadcaster from './broadcaster';

const mockIsOnline = jest.fn();
const mockBroadcaster = {
    getBroadcaster: jest.fn(),
    isOnline: mockIsOnline,
} as unknown as Broadcaster;

describe('StreamStateService', () => {
    let streamStateService: StreamStateService;

    const onlineCallback1 = jest.fn();
    const onlineCallback2 = jest.fn();
    const offlineCallback1 = jest.fn();
    const offlineCallback2 = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        streamStateService = new StreamStateService(mockBroadcaster);
        streamStateService.onOnline(onlineCallback1);
        streamStateService.onOnline(onlineCallback2);
        streamStateService.onOffline(offlineCallback1);
        streamStateService.onOffline(offlineCallback2);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Initialize', () => {
        it('`isOnline` is `false` before `initialize()` is called', () => {
            // Arrange - completed in beforeEach
            // Act
            const result = streamStateService.isOnline;

            // Assert
            expect(result).toBe(false);
        });
        it('`isOnline` is `true` after `initialize()` when broadcaster is online', async () => {
            // Arrange
            mockIsOnline.mockResolvedValue(true);

            // Act
            await streamStateService.initialize();

            // Assert
            expect(streamStateService.isOnline).toBe(true);
        });
        it('`isOnline` is `false` after `initialize()` when broadcaster is offline', async () => {
            // Arrange
            mockIsOnline.mockResolvedValue(false);

            // Act
            await streamStateService.initialize();

            // Assert
            expect(streamStateService.isOnline).toBe(false);
        });
    });

    describe('SetOnline', () => {
        it('Sets `isOnline` true', () => {
            // Arrange - completed in beforeEach
            // Act
            const initial = streamStateService.isOnline;
            streamStateService.setOnline();
            const result = streamStateService.isOnline;

            // Assert
            expect(initial).toBe(false);
            expect(result).toBe(true);
        });
        it('Fires all registered online callbacks', () => {
            // Arrange - completed in beforeEach
            // Act
            streamStateService.setOnline();

            // Assert
            expect(onlineCallback1).toHaveBeenCalledTimes(1);
            expect(onlineCallback2).toHaveBeenCalledTimes(1);
        });
        it.each`
            timeout       | expectedCallCount
            ${0}          | ${0}
            ${300_000}    | ${1}
        `('Offline callbacks fire $expectedCallCount time(s) after advancing $timeout ms', ({ timeout, expectedCallCount }) => {
            // Arrange
            streamStateService.setOnline(); // ensure isLive = true so setOffline guard passes
            streamStateService.setOffline();

            // Act
            jest.advanceTimersByTime(timeout);

            // Assert
            expect(offlineCallback1).toHaveBeenCalledTimes(expectedCallCount);
            expect(offlineCallback2).toHaveBeenCalledTimes(expectedCallCount);
        });
        it('Cancels pending offline timers', () => {
            // Arrange
            streamStateService.setOnline(); // ensure isLive = true so setOffline guard passes
            streamStateService.setOffline();

            // Act
            streamStateService.setOnline(); // cancels pending timers
            jest.advanceTimersByTime(300_000);

            // Assert
            expect(offlineCallback1).not.toHaveBeenCalled();
            expect(offlineCallback2).not.toHaveBeenCalled();
        });
    });

    describe('SetOffline', () => {
        it('Sets `isOnline` to `false`', () => {
            // Arrange
            streamStateService.setOnline();

            // Act
            const initial = streamStateService.isOnline;
            streamStateService.setOffline();
            const result = streamStateService.isOnline;

            // Assert
            expect(initial).toBe(true);
            expect(result).toBe(false);
        });
        it('Does nothing when called again while already offline', () => {
            // Arrange
            streamStateService.setOnline();
            streamStateService.setOffline(); // first call - schedules timer
            streamStateService.setOffline(); // second call - should no-op

            // Act
            jest.advanceTimersByTime(300_000);

            // Assert
            expect(offlineCallback1).toHaveBeenCalledTimes(1);
            expect(offlineCallback2).toHaveBeenCalledTimes(1);
        });
    });

    describe('`onOnline`/`onOffline` registration', () => {
        it('fires all registered online callbacks when setOnline is called', () => {
            // Act
            streamStateService.setOnline();

            // Assert
            expect(onlineCallback1).toHaveBeenCalledTimes(1);
            expect(onlineCallback2).toHaveBeenCalledTimes(1);
        });
        it('fires all registered offline callbacks after grace period', () => {
            // Arrange
            streamStateService.setOnline();
            streamStateService.setOffline();

            // Act
            jest.advanceTimersByTime(300_000);

            // Assert
            expect(offlineCallback1).toHaveBeenCalledTimes(1);
            expect(offlineCallback2).toHaveBeenCalledTimes(1);
        });
    });
});
