import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ApiClient, HelixChatApi } from '@twurple/api';
import { ChatRaidInfo, UserNotice } from '@twurple/chat';
import { mockLogger } from '../../tests/common.mocks.js';
import environment from '../../configurations/environment.js';
import { ICommandHandler, ShoutOutCommand } from '../commands/index.js';
import { RaidHandler } from './raid.handler.js';

const mockApiClient = <unknown>{
    chat: {
        sendAnnouncement: jest.fn<HelixChatApi['sendAnnouncement']>(),
    },
} as jest.Mocked<ApiClient> & {
    chat: jest.Mocked<Pick<HelixChatApi, 'sendAnnouncement'>>;
};

/** Built on the ShoutOutCommand prototype so RaidHandler's constructor-name lookup finds it */
const mockShoutOutCommand = Object.assign(
    Object.create(ShoutOutCommand.prototype),
    { handle: jest.fn<ShoutOutCommand['handle']>() },
) as jest.Mocked<ShoutOutCommand>;

describe('Raid Handler Tests', () => {
    let subject: RaidHandler;

    const channel = 'TestChannel';
    const user = 'testRaidUser';
    const raidInfo = <ChatRaidInfo>{ displayName: 'TestRaidUser', viewerCount: 30 };
    const message = <unknown>{} as UserNotice;
    const shoutOutCommand = 'raid triggered shout out';

    beforeEach(() => {
        jest.resetAllMocks();

        // control the delayed shout out
        jest.useFakeTimers();

        subject = new RaidHandler(
            mockApiClient,
            [<ICommandHandler>{}, mockShoutOutCommand],
            mockLogger,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should announce the raid with the raider and viewer count', async () => {
        // Act
        await subject.onRaid(channel, user, raidInfo, message);

        // Assert
        expect(mockApiClient.chat.sendAnnouncement)
            .toHaveBeenCalledTimes(1);
        expect(mockApiClient.chat.sendAnnouncement)
            .toHaveBeenCalledWith(
                environment.twitchBot.broadcaster.id,
                expect.objectContaining({
                    message: expect.stringContaining(raidInfo.displayName),
                }),
            );
        expect(mockApiClient.chat.sendAnnouncement)
            .toHaveBeenCalledWith(
                environment.twitchBot.broadcaster.id,
                expect.objectContaining({
                    message: expect.stringContaining(`${raidInfo.viewerCount}`),
                }),
            );
        expect(mockLogger.info)
            .toHaveBeenCalledWith(expect.any(String));
    });

    it('should shout out the raider after 3 seconds', async () => {
        // Act
        await subject.onRaid(channel, user, raidInfo, message);

        // Assert
        expect(mockShoutOutCommand.handle)
            .not.toHaveBeenCalled();

        jest.advanceTimersByTime(3000);

        expect(mockShoutOutCommand.handle)
            .toHaveBeenCalledTimes(1);
        expect(mockShoutOutCommand.handle)
            .toHaveBeenCalledWith(
                channel,
                shoutOutCommand,
                expect.objectContaining({ displayName: user }),
                shoutOutCommand,
                [raidInfo.displayName],
                undefined,
                true,
            );
    });
});
