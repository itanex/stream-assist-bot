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
import { AccountAgeCommand } from './accountAgeCommand.js';
import Timespan, { getAgeReport } from '../utilities/timeSpan.js';
import { transientKeywords } from '../utilities/default-responses.js';

describe('Account Age Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const message = 'TestMessage';

    const responses = { accountage: { '': [`%${transientKeywords.targetuser}% | %${transientKeywords.accountage}%`] } };
    const unrelatedResponses = { unrelated: { '': ['unrelated response text'] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new AccountAgeCommand(
        mockChatClient,
        mockApiClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('should report account age of target account', () => {
        const chatUser = <ChatUser>{
            displayName: 'TestUser',
            userName: 'TestUser',
        };

        it('should display age of speaker account', async () => {
            // Arrange
            const subject = createSubject(responses);
            const targetUser = <HelixUser>{
                displayName: chatUser.displayName,
                creationDate: new Date(2000, 0, 1),
            };
            const args = [''];

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(targetUser);

            const age = getAgeReport(Timespan.fromNow(targetUser.creationDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalledWith(chatUser.userName);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `${targetUser.displayName} | ${age}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it('should display age of targeted account', async () => {
            // Arrange
            const subject = createSubject(responses);
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

            const age = getAgeReport(Timespan.fromNow(targetUser.creationDate));

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalledWith(expectedApiClientParameter);
            expect(mockChatClient.say)
                .toHaveBeenCalledWith(channel, `${targetUser.displayName} | ${age}`);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it('should say nothing (no user found)', async () => {
            // Arrange
            const subject = createSubject(responses);

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(null);

            // Act
            await subject.handle(channel, command, chatUser, message, []);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it('should say nothing and log warning (no text configured)', async () => {
            // Arrange
            const subject = createSubject(unrelatedResponses);
            const targetUser = <HelixUser>{
                displayName: 'TargetUser',
                creationDate: new Date(2000, 0, 1),
            };
            const args = ['irrelevant'];

            mockApiClient
                .users
                .getUserByName
                .mockResolvedValue(targetUser);

            // Act
            await subject.handle(channel, command, chatUser, message, args);

            // Assert
            expect(mockApiClient.users.getUserByName).toHaveBeenCalled();
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: '' });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
