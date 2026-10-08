import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixUser } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { HugCommand } from './hugCommand.js';

describe('Hug Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser', userName: 'TestUser' };

    const responses = {
        hug: {
            '': ['other: %speakinguser% > %targetuser%'],
            self: ['self: %speakinguser% > %targetuser%'],
            notfound: ['notfound: %speakinguser% > %targetuser%'],
        },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new HugCommand(
        mockChatClient,
        mockApiClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should hug a user in chat', () => {
        const selfApiUser = <HelixUser>{ displayName: 'TestUser', id: 'TestUserId' };
        const targetApiUser = <HelixUser>{ displayName: 'TargetUser', id: 'TargetUserId' };

        it.each`
            args                  | apiUser          | expected
            ${['']}               | ${null}          | ${'self: TestUser > TestUser'}
            ${['TestUser']}       | ${selfApiUser}   | ${'self: TestUser > TestUser'}
            ${['TargetUser']}     | ${targetApiUser} | ${'other: TestUser > TargetUser'}
            ${['TargetUser']}     | ${null}          | ${'notfound: TestUser > TargetUser'}
            ${['  TargetUser  ']} | ${null}          | ${'notfound: TestUser > TargetUser'}
        `(`args: '$args' says '$expected'`, async ({
            args,
            apiUser,
            expected,
        }: { args: string[], apiUser: HelixUser | null, expected: string }) => {
            // Arrange
            const subject = createSubject(responses);

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(apiUser);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            if (args[0]) {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledWith(args[0].toLocaleLowerCase().trim());
            } else {
                expect(mockApiClient.users.getUserByName)
                    .toHaveBeenCalledTimes(0);
            }

            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expected);
            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.any(String));
        });
    });

    it('should say nothing and log warning when no text is configured', async () => {
        // Arrange
        const subject = createSubject(unrelatedResponses);

        // Act
        await subject.handle(channel, command, user, message, ['']);

        // Assert
        expect(mockChatClient.say).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: 'self' });
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
    });
});
