// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ChatClient, ChatUser } from '@twurple/chat';
import duration from 'dayjs/plugin/duration';
import { Container } from 'inversify';
import winston from 'winston';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import { ICommandHandler } from './iCommandHandler';
import { LurkCommand, UnLurkCommand, WhoIsLurkingCommand, clearLurkingUsers } from './lurkCommands';
import { LurkingUsers } from '../../database';

describe('Lurk Commands Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';
    const user = <ChatUser>{ displayName: 'TestUser' };

    const container: Container = new Container();
    let expectedChatClient: ChatClient;
    let expectedLogger: winston.Logger;

    beforeEach(() => {
        jest.resetAllMocks();
        container.unbindAll();
        container
            .bind<ChatClient>(ChatClient)
            .toConstantValue(mockChatClient);

        container
            .bind<winston.Logger>(InjectionTypes.Logger)
            .toConstantValue(mockLogger);

        expectedChatClient = container
            .get(ChatClient);

        expectedLogger = container
            .get<winston.Logger>(InjectionTypes.Logger);
    });

    describe('Lurk Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(LurkCommand);
        });

        it(`should say something in chat when created`, async () => {
            // Arrange
            LurkingUsers.setUserToLurk = jest.fn()
                .mockResolvedValue([{
                    displayName: user.displayName,
                }, true]);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${LurkCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(LurkingUsers.setUserToLurk)
                .toHaveBeenCalledTimes(1);
            expect(LurkingUsers.setUserToLurk)
                .toHaveBeenCalledWith(user);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(user.displayName));

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });

        it(`should do nothing if user already lurking`, async () => {
            // Arrange
            LurkingUsers.setUserToLurk = jest.fn()
                .mockResolvedValue([{
                    displayName: user.displayName,
                }, false]);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${LurkCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(LurkingUsers.setUserToLurk)
                .toHaveBeenCalledTimes(1);
            expect(LurkingUsers.setUserToLurk)
                .toHaveBeenCalledWith(user);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(0);

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    describe('Unlurk Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(UnLurkCommand);
        });

        it('should say something in chat when unlurked', async () => {
            // Arrange
            const humanize = 'TestHumanize';
            const savedUser = {
                displayName: 'TestUserName',
                startTime: new Date(2020, 1, 1, 0, 0, 0),
                endTime: new Date(2020, 1, 1, 1, 0, 0),
                duration: jest.fn().mockReturnValue(<unknown>{
                    years: 0,
                    months: 0,
                    weeks: 0,
                    days: 0,
                    hours: 1,
                    minutes: 0,
                    seconds: 0,
                    milliseconds: 0,
                    humanize: jest.fn().mockImplementation(() => humanize),
                } as duration.Duration),
            };
            const calledUser = {
                endTime: null,
                save: jest.fn().mockResolvedValue(savedUser),
            };

            LurkingUsers.setUserToUnlurk = jest.fn()
                .mockResolvedValue(calledUser);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${UnLurkCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(LurkingUsers.setUserToUnlurk)
                .toHaveBeenCalledTimes(1);
            expect(LurkingUsers.setUserToUnlurk)
                .toHaveBeenCalledWith(user);

            expect(calledUser.save).toHaveBeenCalledTimes(1);
            expect(savedUser.duration).toHaveBeenCalledTimes(1);
            expect(savedUser.duration().humanize).toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(savedUser.displayName));
            expect(expectedChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(humanize));

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });

        it(`should do nothing if user is not lurking`, async () => {
            // Arrange
            const calledUser = {
                endTime: null,
                save: jest.fn().mockResolvedValue(null),
            };

            LurkingUsers.setUserToUnlurk = jest.fn()
                .mockResolvedValue(null);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${UnLurkCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(LurkingUsers.setUserToUnlurk)
                .toHaveBeenCalledTimes(1);
            expect(LurkingUsers.setUserToUnlurk)
                .toHaveBeenCalledWith(user);

            expect(calledUser.save)
                .toHaveBeenCalledTimes(0);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(0);

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    describe('WhoIsLurking Command', () => {
        beforeEach(() => {
            container
                .bind<ICommandHandler>(InjectionTypes.CommandHandlers)
                .to(WhoIsLurkingCommand);
        });

        it.each([
            [
                [],
                ['no users'],
            ], [
                [{ displayName: 'user1' }],
                ['1', 'user1']],
            [
                [{ displayName: 'user2' }, { displayName: 'user1' }],
                ['2', 'user1', 'user2'],
            ], [
                [{ displayName: 'user3' }, { displayName: 'user2' }, { displayName: 'user1' }],
                ['3', 'user1', 'user2', 'user3'],
            ], [
                [{ displayName: 'user4' }, { displayName: 'user3' }, { displayName: 'user2' }, { displayName: 'user1' }],
                ['4', 'user1', 'user2', 'user3', 'user4'],
            ], [
                [{ displayName: 'user5' }, { displayName: 'user4' }, { displayName: 'user3' }, { displayName: 'user2' }, { displayName: 'user1' }],
                ['5', 'user1', 'user2', 'user3', 'user4', 'user5'],
            ], [
                [{ displayName: 'user6' }, { displayName: 'user4' }, { displayName: 'user3' }, { displayName: 'user2' }, { displayName: 'user1' }],
                ['6'],
            ],
        ])(`should say something in chat based records '%s' '%s'`, async (records: LurkingUsers[], includedWords: string[]) => {
            // Arrange
            LurkingUsers.getAllLurkingUsers = jest.fn()
                .mockResolvedValue(records);

            const subject = container
                .getAll<ICommandHandler>(InjectionTypes.CommandHandlers)
                .find(x => x.constructor.name === `${WhoIsLurkingCommand.name}`);

            // Act
            await subject.handle(channel, command, user, message, []);

            // Assert
            expect(LurkingUsers.getAllLurkingUsers)
                .toHaveBeenCalledTimes(1);

            expect(expectedChatClient.say)
                .toHaveBeenCalledTimes(1);
            includedWords.forEach(x => {
                expect(expectedChatClient.say)
                    .toHaveBeenCalledWith(channel, expect.stringContaining(x));
            });

            expect(expectedLogger.info)
                .toHaveBeenCalledWith(expect
                    .stringMatching(`(?=.*\\b${command}\\b)(?=.*\\b${channel}\\b)(?=.*\\b${user.displayName}\\b)(?=.*\\b${message}\\b)`));
        });
    });

    describe('Utility: Clear Lurking Users', () => {
        it.each([
            [
                [],
            ], [
                [{ displayName: 'user1' }],
            ], [
                [{ displayName: 'user2' }, { displayName: 'user1' }],
            ],
        ])(`should clear users in db '%s'`, async (users: LurkingUsers[]) => {
            // Arrange
            const count: number = users.length;

            LurkingUsers.setAllUsersToUnlurk = jest.fn()
                .mockResolvedValue([count, users]);

            // Act
            await clearLurkingUsers(expectedLogger);

            // Assert
            expect(LurkingUsers.setAllUsersToUnlurk)
                .toHaveBeenCalledTimes(1);

            if (count > 0) {
                expect(expectedLogger.info)
                    .toHaveBeenCalledWith(expect.stringContaining('DataStore::'));
                expect(expectedLogger.info)
                    .toHaveBeenCalledWith(expect.stringContaining(users.map(x => x.displayName).join(', ')));
            }
        });
    });
});
