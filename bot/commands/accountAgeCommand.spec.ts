import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixUser } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import {
    mockApiClient,
    mockChatClient,
    mockCommandResponseRepository,
    mockLogger,
} from '../../tests/common.mocks.js';
import { AccountAgeCommand } from './accountAgeCommand.js';
import Timespan, { getAgeReport } from '../utilities/timeSpan.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Account Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';

    let subject: AccountAgeCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new AccountAgeCommand(
            mockChatClient,
            mockApiClient,
            mockCommandResponseRepository,
            mockLogger,
        );
    });

    describe('should report account age of target account', () => {
        const chatUser = <ChatUser>{
            displayName: 'TestUser',
            userName: 'TestUser',
        };

        it('should display age of speaker account', async () => {
            // Arrange
            const targetUser = <HelixUser>{
                displayName: chatUser.displayName,
                creationDate: new Date(2000, 0, 1),
            };
            const args = [''];

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(targetUser);

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.accountage}%`);

            const age = getAgeReport(Timespan.fromNow(targetUser.creationDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalledWith(targetUser.displayName);
            expect(mockCommandResponseRepository.getCommandText).toHaveBeenCalledWith(subject.commandName);

            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(targetUser.displayName));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(age));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it('should display age of targeted account', async () => {
            // Arrange
            const targetUser = <HelixUser>{
                displayName: 'ProperCasedName',
                creationDate: new Date(2000, 0, 1),
            };

            // mixed case + padding, proves trim + lowercase
            const args = ['  TargetedUser  '];
            const expectedApiClientParameter = 'targeteduser';

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(targetUser);

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(`%${transientKeywords.targetuser}%, %${transientKeywords.accountage}%`);

            const age = getAgeReport(Timespan.fromNow(targetUser.creationDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalledWith(expectedApiClientParameter);
            expect(mockCommandResponseRepository.getCommandText).toHaveBeenCalledWith(subject.commandName);

            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(targetUser.displayName));
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, expect.stringContaining(age));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it('should say nothing (no user found)', async () => {
            // Arrange
            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
        it('should say nothing and log warning', async () => {
            // Arrange
            const targetUser = <HelixUser>{
                displayName: '',
                creationDate: new Date(2000, 0, 1),
            };
            const args = ['irrelevant'];

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(targetUser);

            mockCommandResponseRepository
                .getCommandText
                .mockReturnValue(undefined);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalled();
            expect(mockCommandResponseRepository.getCommandText).toHaveBeenCalledWith(subject.commandName);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(subject.commandName));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.anything());
        });
    });
});
