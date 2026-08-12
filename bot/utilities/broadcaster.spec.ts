import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixPrivilegedUser } from '@twurple/api';
import Broadcaster from './broadcaster.js';
import { mockApiClient } from '../../tests/common.mocks.js';
import { type Environment } from '../../configurations/environment.js';

describe('Broadcaster', () => {
    let broadcaster: Broadcaster;

    const mockEnvironment = <unknown>{
        twitchBot: {
            broadcaster: {
                id: 'test-broadcaster-id',
            },
            bot: {
                userId: 'test-bot-user-id',
            },
        },
    } as Environment;

    const mockHelixPrivilegedUser = <unknown>{
        getStream: jest.fn(),
    } as jest.Mocked<HelixPrivilegedUser>;

    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        jest.useFakeTimers();

        mockApiClient
            .users
            .getAuthenticatedUser
            .mockResolvedValue(mockHelixPrivilegedUser);
        broadcaster = new Broadcaster(
            mockEnvironment,
            mockApiClient,
        );
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
            expect(mockApiClient
                .users
                .getAuthenticatedUser).toHaveBeenCalledWith('test-broadcaster-id');
            expect(mockApiClient
                .users
                .getAuthenticatedUser).not.toHaveBeenCalledWith('test-bot-user-id');
        });
        it('returns cached value on second call without hitting the API again', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();
            await broadcaster.getBroadcaster();

            // Assert
            expect(mockApiClient
                .users
                .getAuthenticatedUser).toHaveBeenCalledTimes(1);
        });
        it('calls getAuthenticatedUser a second time when cache timer has expired', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();
            jest.advanceTimersByTime(5 * 60 * 1000);
            await broadcaster.getBroadcaster();

            // Assert
            expect(mockApiClient
                .users
                .getAuthenticatedUser).toHaveBeenCalledTimes(2);
        });
    });

    describe('isOnline()', () => {
        it('calls getStream to check live status', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockHelixPrivilegedUser.getStream).toHaveBeenCalledTimes(1);
        });
        it('returns cached value on second call without hitting the API again', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockHelixPrivilegedUser.getStream).toHaveBeenCalledTimes(1);
        });
        it('calls getStream a second time when cache timer has expired', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.isOnline();
            jest.advanceTimersByTime(5 * 60 * 1000);
            await broadcaster.isOnline();

            // Assert - verify the correct identity was passed
            expect(mockHelixPrivilegedUser.getStream).toHaveBeenCalledTimes(2);
        });
    });
});
