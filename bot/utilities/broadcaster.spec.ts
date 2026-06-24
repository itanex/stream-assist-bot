import 'reflect-metadata';
import { ApiClient, HelixPrivilegedUser } from '@twurple/api';
import Broadcaster from './broadcaster';

const expectedBroadcasterId = 'test-broadcaster-id';
const expectedBotId = 'test-bot-user-id';

jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            broadcaster: {
                id: expectedBroadcasterId,
            },
            bot: {
                userId: expectedBotId,
            },
        },
    },
}));

const mockGetAuthenticatedUser = jest.fn();

const mockApiClient = {
    users: {
        getAuthenticatedUser: mockGetAuthenticatedUser,
    },
} as unknown as ApiClient;

describe('Broadcaster', () => {
    let broadcaster: Broadcaster;

    beforeEach(() => {
        jest.clearAllMocks();
        broadcaster = new Broadcaster(mockApiClient);
    });

    describe('getBroadcaster()', () => {
        it('calls getAuthenticatedUser with the broadcaster ID, not the bot user ID', async () => {
            // Arrange - Completed by beforeEach
            // Act
            await broadcaster.getBroadcaster();

            // Assert - verify the correct identity was passed
            expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(expectedBroadcasterId);
            expect(mockGetAuthenticatedUser).not.toHaveBeenCalledWith(expectedBotId);
        });
    });
});
