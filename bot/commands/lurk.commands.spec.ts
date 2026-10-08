import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { LurkingUsers } from '../../database/index.js';
import {
    LurkCommand,
    UnLurkCommand,
    WhoIsLurkingCommand,
    clearLurkingUsers,
} from './lurk.commands.js';
import LurkRespository from '../repositories/lurk.respository.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Lurk Commands Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const responses = {
        lurk: { '': [`lurk: %${transientKeywords.speakinguser}%`] },
        unlurk: { '': [`unlurk: %${transientKeywords.speakinguser}% %${transientKeywords.lurkduration}%`] },
    };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    const mockLurkRepository = <unknown>{
        getAllLurkingUsers: jest.fn(),
        setUserToLurk: jest.fn(),
        setUserToUnlurk: jest.fn(),
        setAllUsersToUnlurk: jest.fn(),
    } as jest.Mocked<LurkRespository>;

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('Lurk Command', () => {
        const createSubject = (entries: Record<string, Record<string, string[]>>) => new LurkCommand(
            mockChatClient,
            createService(entries),
            mockLurkRepository,
            mockLogger,
        );

        it(`should say something in chat when created`, async () => {
            // Arrange
            const subject = createSubject(responses);

            mockLurkRepository
                .setUserToLurk
                .mockResolvedValue([
                    <LurkingUsers>{
                        displayName: user.displayName,
                    },
                    true,
                ]);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToLurk)
                .toHaveBeenCalledWith(user);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, `lurk: ${user.displayName}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`should say nothing and log warning when no text is configured`, async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            mockLurkRepository
                .setUserToLurk
                .mockResolvedValue([
                    <LurkingUsers>{
                        displayName: user.displayName,
                    },
                    true,
                ]);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`should do nothing if user already lurking`, async () => {
            // Arrange
            const subject = createSubject(responses);

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
                .toHaveBeenCalledWith(user);
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('Unlurk Command', () => {
        const createSubject = (entries: Record<string, Record<string, string[]>>) => new UnLurkCommand(
            mockChatClient,
            createService(entries),
            mockLurkRepository,
            mockLogger,
        );

        const humanize = 'TestHumanize';
        const createUnlurkedUser = () => <unknown>{
            displayName: 'LurkingUser',
            duration: jest.fn().mockReturnValue({
                humanize: jest.fn().mockReturnValue(humanize),
            }),
        } as jest.Mocked<LurkingUsers>;

        it(`should say something in chat when unlurked`, async () => {
            // Arrange
            const subject = createSubject(responses);
            const calledUser = createUnlurkedUser();

            mockLurkRepository
                .setUserToUnlurk
                .mockResolvedValue(calledUser);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToUnlurk)
                .toHaveBeenNthCalledWith(1, user);
            expect(mockChatClient.say)
                .toHaveBeenNthCalledWith(1, channel, `unlurk: ${calledUser.displayName} ${humanize}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`should say nothing and log warning when no text is configured`, async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);

            mockLurkRepository
                .setUserToUnlurk
                .mockResolvedValue(createUnlurkedUser());

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it(`should do nothing if user is not lurking`, async () => {
            // Arrange
            const subject = createSubject(responses);

            mockLurkRepository
                .setUserToUnlurk
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(mockLurkRepository.setUserToUnlurk)
                .toHaveBeenNthCalledWith(1, user);
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
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
                .toHaveBeenCalledWith(expect.any(String));
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
                    .toHaveBeenCalledWith(expect.any(String));
            } else {
                expect(mockLogger.info).not.toHaveBeenCalled();
            }
        });
    });
});
