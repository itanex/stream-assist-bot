import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseRepository,
    mockLogger,
} from '../../tests/common.mocks.js';
import {
    LurkCommand,
    UnLurkCommand,
    WhoIsLurkingCommand,
    clearLurkingUsers,
} from './lurk.commands.js';
import { LurkingUsers } from '../../database/index.js';
import LurkRespository from '../utilities/lurk.respository.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Lurk Commands Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const mockLurkRepository = <unknown>{
        getAllLurkingUsers: jest.fn(),
        setUserToLurk: jest.fn(),
        setUserToUnlurk: jest.fn(),
        setAllUsersToUnlurk: jest.fn(),
    } as jest.Mocked<LurkRespository>;

    describe('Lurk Command', () => {
        let subject: LurkCommand;

        beforeEach(() => {
            jest.resetAllMocks();

            subject = new LurkCommand(
                mockChatClient,
                mockCommandResponseRepository,
                mockLurkRepository,
                mockLogger,
            );
        });

        it.each([
            [`%${transientKeywords.speakinguser}%`],
            [undefined],
        ])(`should say something in chat when created (%s)`, async (responseText: string | undefined) => {
            // Arrange
            mockLurkRepository
                .setUserToLurk
                .mockResolvedValue([
                    <LurkingUsers>{
                        displayName: user.displayName,
                    },
                    true,
                ]);

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(responseText);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToLurk)
                .toHaveBeenCalledTimes(1);
            expect(mockLurkRepository.setUserToLurk)
                .toHaveBeenCalledWith(user);

            expect(mockCommandResponseRepository.getCommandText)
                .toHaveBeenNthCalledWith(1, subject.commandName);

            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, expect.stringContaining(user.displayName));

            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });

        it(`should do nothing if user already lurking`, async () => {
            // Arrange
            mockLurkRepository
                .setUserToLurk
                .mockResolvedValue([
                    <LurkingUsers>{
                        displayName: user.displayName,
                    },
                    false,
                ]);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToLurk)
                .toHaveBeenCalledTimes(1);
            expect(mockLurkRepository.setUserToLurk)
                .toHaveBeenCalledWith(user);

            expect(mockChatClient.say).not.toHaveBeenCalled();

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());
        });
    });

    describe('Unlurk Command', () => {
        let subject: UnLurkCommand;

        beforeEach(() => {
            jest.resetAllMocks();

            subject = new UnLurkCommand(
                mockChatClient,
                mockCommandResponseRepository,
                mockLurkRepository,
                mockLogger,
            );
        });

        it.each([
            [`%${transientKeywords.speakinguser}%, %${transientKeywords.lurkduration}%`],
            [undefined],
        ])(`should say something in chat when unlurked (%s)`, async (responseText: string | undefined) => {
            // Arrange
            const humanize = 'TestHumanize';
            const calledUser = <unknown>{
                displayName: 'LurkingUser',
                duration: jest.fn().mockReturnValue({
                    humanize: jest.fn().mockReturnValue(humanize),
                }),
            } as jest.Mocked<LurkingUsers>;

            mockLurkRepository
                .setUserToUnlurk
                .mockResolvedValue(calledUser);

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(responseText);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToUnlurk)
                .toHaveBeenNthCalledWith(1, user);

            expect(calledUser.duration).toHaveBeenCalledTimes(1);
            expect(calledUser.duration().humanize).toHaveBeenCalledTimes(1);

            expect(mockCommandResponseRepository.getCommandText)
                .toHaveBeenNthCalledWith(1, subject.commandName);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, expect.stringContaining(calledUser.displayName));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(humanize));

            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });

        it(`should do nothing if user is not lurking`, async () => {
            // Arrange
            const calledUser = <unknown>{
                endTime: null,
            } as LurkingUsers;
            calledUser.save = jest.fn<() => Promise<LurkingUsers>>()
                .mockResolvedValue(calledUser);

            mockLurkRepository
                .setUserToUnlurk
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToUnlurk)
                .toHaveBeenNthCalledWith(1, user);

            expect(calledUser.save).not.toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
    });

    describe('WhoIsLurking Command', () => {
        let subject: WhoIsLurkingCommand;

        beforeEach(() => {
            jest.resetAllMocks();

            subject = new WhoIsLurkingCommand(
                mockChatClient,
                mockLurkRepository,
                mockLogger,
            );
        });

        it.each([
            [
                [],
                ['no users'],
            ], [
                [<LurkingUsers>{ displayName: 'user1' }],
                ['1', 'user1']],
            [
                [<LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
                ['2', 'user1', 'user2'],
            ], [
                [<LurkingUsers>{ displayName: 'user3' }, <LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
                ['3', 'user1', 'user2', 'user3'],
            ], [
                [<LurkingUsers>{ displayName: 'user4' }, <LurkingUsers>{ displayName: 'user3' }, <LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
                ['4', 'user1', 'user2', 'user3', 'user4'],
            ], [
                [<LurkingUsers>{ displayName: 'user5' }, <LurkingUsers>{ displayName: 'user4' }, <LurkingUsers>{ displayName: 'user3' }, <LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
                ['5', 'user1', 'user2', 'user3', 'user4', 'user5'],
            ], [
                [<LurkingUsers>{ displayName: 'user6' }, <LurkingUsers>{ displayName: 'user5' }, <LurkingUsers>{ displayName: 'user4' }, <LurkingUsers>{ displayName: 'user3' }, <LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
                ['6'],
            ],
        ])(`should say something in chat based records '%s' '%s'`, async (records: LurkingUsers[], includedWords: string[]) => {
            // Arrange
            mockLurkRepository
                .getAllLurkingUsers
                .mockResolvedValue(records);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.getAllLurkingUsers)
                .toHaveBeenCalledTimes(1);

            expect(mockChatClient.say)
                .toHaveBeenCalledTimes(1);
            includedWords.forEach(x => {
                expect(mockChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(x));
            });

            expect(mockLogger.info)
                .toHaveBeenCalledWith(expect.anything());
        });
    });

    describe('Utility: Clear Lurking Users', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

        it.each([
            [
                [],
            ], [
                [<LurkingUsers>{ displayName: 'user1' }],
            ], [
                [<LurkingUsers>{ displayName: 'user2' }, <LurkingUsers>{ displayName: 'user1' }],
            ],
        ])(`should clear users in db '%s'`, async (users: LurkingUsers[]) => {
            // Arrange
            const count: number = users.length;

            mockLurkRepository
                .setAllUsersToUnlurk
                .mockResolvedValue([count, users]);

            // Act
            await clearLurkingUsers(mockLurkRepository, mockLogger);

            // Assert
            expect(mockLurkRepository.setAllUsersToUnlurk)
                .toHaveBeenCalledTimes(1);

            if (count > 0) {
                expect(mockLogger.info)
                    .toHaveBeenCalledWith(expect.stringContaining('DataStore::'));
                expect(mockLogger.info)
                    .toHaveBeenCalledWith(expect.stringContaining(users.map(x => x.displayName).join(', ')));
            }
        });
    });
});
