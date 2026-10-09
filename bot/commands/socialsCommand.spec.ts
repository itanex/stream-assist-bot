import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import {
    mockChatClient,
    mockCommandResponseService,
    mockLogger,
} from '../../tests/common.mocks.js';
import { SocialsCommand } from './socialsCommand.js';

const messageFn = (
    command: string,
    subcommand: string,
    body: string = '',
) => `!${command} ${subcommand} ${body}`.trim();

describe('Socials Command Tests', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{
        displayName: 'TestUser',
    };

    const knownVariant = 'discord';
    const response = 'Test Response Message';
    const responses = { socials: { [knownVariant]: [response] } };

    /** Serve getCommandResponse from the given entries (commandName -> variant -> texts) */
    const createService = (entries: Record<string, Record<string, string[]>>) => {
        mockCommandResponseService
            .getCommandResponse
            .mockImplementation((commandName, variant = '') => entries[commandName]?.[variant]?.[0]);

        return mockCommandResponseService;
    };

    const createSubject = (entries: Record<string, Record<string, string[]>>) => new SocialsCommand(
        mockChatClient,
        createService(entries),
        mockLogger,
    );

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('cooldownKey()', () => {
        it.each`
            args                  | expected
            ${[undefined]}        | ${SocialsCommand.name}
            ${['UnknownVariant']} | ${SocialsCommand.name}
            ${[knownVariant]}     | ${`${SocialsCommand.name}:${knownVariant}`}
        `(`args: '$args' should use key '$expected'`, async ({ args, expected }: { args: any[], expected: string }) => {
            // Arrange
            const subject = createSubject(responses);

            // Act
            const result = subject.cooldownKey(args);

            // Assert
            expect(result).toBe(expected);
        });
    });

    describe('handle()', () => {
        it('should say the variant text', async () => {
            // Arrange
            const subject = createSubject(responses);
            const message = messageFn(subject.commandName!, knownVariant);

            // Act
            await subject.handle(channel, command, user, message, [knownVariant]);

            // Assert
            expect(mockChatClient.say).toHaveBeenCalledWith(channel, response);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });

        it('should say nothing and log a warning (unknown variant)', async () => {
            // Arrange
            const subject = createSubject(responses);
            const subcommand = 'UnknownVariant';
            const message = messageFn(subject.commandName!, subcommand);
            const args = [subcommand];

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockChatClient.say).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String), { variant: subcommand, args, message });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
