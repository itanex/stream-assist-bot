import 'reflect-metadata';
import { ApiClient } from '@twurple/api';
import Broadcaster from './broadcaster';

jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            broadcaster: {
                id: 'test-broadcaster-id',
            },
            bot: {
                userId: 'test-bot-user-id',
            },
        },
    },
}));

const mockGetAuthenticatedUser = jest.fn();
const mockGetStream = jest.fn();

const mockApiClient = {
    users: {
        getAuthenticatedUser: mockGetAuthenticatedUser,
    },
} as unknown as ApiClient;

describe('Broadcaster', () => {
    let broadcaster: Broadcaster;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockGetAuthenticatedUser.mockResolvedValue({ getStream: mockGetStream });
        broadcaster = new Broadcaster(mockApiClient);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getBroadcaster()', () => {
        it('calls getAuthenticatedUser with the broadcaster ID, not the bot user ID', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();

            // Assert - verify the correct identity was passed
            expect(mockGetAuthenticatedUser).toHaveBeenCalledWith('test-broadcaster-id');
            expect(mockGetAuthenticatedUser).not.toHaveBeenCalledWith('test-bot-user-id');
        });
        it('returns cached value on second call without hitting the API again', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();
            await broadcaster.getBroadcaster();

            // Assert
            expect(mockGetAuthenticatedUser).toHaveBeenCalledTimes(1);
        });
        it('calls getAuthenticatedUser a second time when cache timer has expired', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();
            jest.advanceTimersByTime(5 * 60 * 1000);
            await broadcaster.getBroadcaster();

            // Assert
            expect(mockGetAuthenticatedUser).toHaveBeenCalledTimes(2);
        });
    });

    describe('isOnline()', () => {
        it('calls getStream to check live status', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockGetStream).toHaveBeenCalledTimes(1);
        });
        it('returns cached value on second call without hitting the API again', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockGetStream).toHaveBeenCalledTimes(1);
        });
        it('calls getStream a second time when cache timer has expired', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();
            jest.advanceTimersByTime(5 * 60 * 1000);
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockGetStream).toHaveBeenCalledTimes(2);
        });
    });
});
