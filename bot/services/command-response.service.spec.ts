import 'reflect-metadata';
import { jest } from '@jest/globals';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import {
    type CommandTextValidationResult,
    type CommandTextInsertResult,
    type CommandTextUpdateResult,
    type CommandTextRemoveResult,
    type CommandTextRestoreResult,
} from './command-response.service.js';
import { mockLogger } from '../../tests/common.mocks.js';
import { CommandResponse } from '../../database/index.js';
import { CommandResponseRepository } from '../repositories/index.js';

type CommandResponseServiceModule = typeof import('./command-response.service.js');
type MockDefaultResponses = { testResponse: string };
type MockCommandFamilies = { testCommand: string };

jest.unstable_mockModule('../utilities/default-responses', () => ({
    __esModule: true,
    CommandFamilies: { 'test-command-name': 'test-command-name' },
    defaultResponses: { testResponse: 'Test about response' },
}));

const mockCommandResponseRepository = <unknown>{
    seed: jest.fn<CommandResponseRepository['seed']>(),
    findAll: jest.fn<CommandResponseRepository['findAll']>(),
    getCommandText: jest.fn<CommandResponseRepository['getCommandText']>(),
    getCommandVariants: jest.fn<CommandResponseRepository['getCommandVariants']>(),
    addCommandText: jest.fn<CommandResponseRepository['addCommandText']>(),
    updateCommandText: jest.fn<CommandResponseRepository['updateCommandText']>(),
    removeCommandText: jest.fn<CommandResponseRepository['removeCommandText']>(),
    restoreCommandText: jest.fn<CommandResponseRepository['restoreCommandText']>(),
} as jest.Mocked<CommandResponseRepository>;

describe('CommandResponse.Service (postgres)', () => {
    const defaultVariant = '';
    const validText = 'Edited Text';
    const validName = 'ValidName';
    const testCommandName = 'test-command-name';
    const testVariant = 'test-command-variant';
    const testCommandText = 'test-command-text';
    const testCommandVariantText = 'test-command-variant-text';
    const testCommandResponse = <unknown>{
        commandName: testCommandName,
        variant: '',
        text: testCommandText,
    } as CommandResponse;
    const testCommandResponseVariant = <unknown>{
        commandName: testCommandName,
        variant: testVariant,
        text: testCommandVariantText,
    } as CommandResponse;

    let CommandResponseService: CommandResponseServiceModule['default'];
    let cacheKey: CommandResponseServiceModule['cacheKey'];
    let CommandFamilies: jest.MockedObject<MockCommandFamilies>;
    let defaultResponses: jest.MockedObject<MockDefaultResponses>;

    let subject: InstanceType<CommandResponseServiceModule['default']>;

    beforeAll(async () => {
        ({ default: CommandResponseService, cacheKey } = await import('./command-response.service.js'));

        ({
            defaultResponses,
            CommandFamilies,
        } = await import('../utilities/default-responses.js') as unknown as {
            defaultResponses: MockDefaultResponses;
            CommandFamilies: MockCommandFamilies;
        });
    });

    beforeEach(async () => {
        jest.resetAllMocks();

        subject = new CommandResponseService(
            mockCommandResponseRepository,
            mockLogger,
        );
    });

    describe('initialize()', () => {
        it('seeds row, gets installed default', async () => {
            // Arrange
            mockCommandResponseRepository
                .findAll
                .mockResolvedValue([
                    testCommandResponse,
                ]);

            // Act
            await subject.initialize();

            // Assert
            expect(mockCommandResponseRepository.seed)
                .toHaveBeenCalledWith(defaultResponses);
            expect(mockCommandResponseRepository.findAll)
                .toHaveBeenCalled();

            expect(subject['responseCache'].size).toBe(1);
            expect(subject['responseCache'].get(cacheKey(testCommandName)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    text: testCommandText,
                }));
        });

        it('should not seed twice', async () => {
            // Arrange
            mockCommandResponseRepository
                .findAll
                .mockResolvedValue([testCommandResponse]);

            // Act
            await subject.initialize();
            await subject.initialize();

            // Assert
            expect(mockCommandResponseRepository.seed)
                .toHaveBeenCalledWith(defaultResponses);
            expect(mockCommandResponseRepository.findAll)
                .toHaveBeenCalled();

            expect(subject['responseCache'].size).toBe(1);
            expect(subject['responseCache'].get(cacheKey(testCommandName)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    text: testCommandText,
                }));
        });
    });

    describe('isValidCommandName()', () => {
        it(`should return true for commandName that exists`, () => {
            // Arrange
            // Act
            const result = subject.isValidCommandName(testCommandName);

            // Assert
            expect(result).toBe(true);
        });
        it(`should return false for commandName that does not exists`, () => {
            // Arrange
            // Act
            const result = subject.isValidCommandName('UknownCommand');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('pre-seeded tests', () => {
        beforeEach(async () => {
            mockCommandResponseRepository
                .findAll
                .mockResolvedValue([
                    testCommandResponse,
                    testCommandResponseVariant,
                ]);

            await subject.initialize();
        });

        afterEach(() => {
            subject['responseCache'].clear();
        });

        describe('getCommandVariants()', () => {
            it('should return the command variant (cache)', () => {
                // Arrange
                // Act
                const result = subject.getCommandVariants(testCommandName);

                // Assert
                expect(result.length).toBe(2);
                expect(result).toEqual(expect.arrayContaining([
                    defaultVariant,
                    testVariant,
                ]));
            });

            it('should return empty collection for invalid commandName (empty string)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandVariants('');

                // Assert
                expect(result).toEqual<string[]>([]);
            });

            it('should return empty collection for unknown command', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandVariants('unknown');

                // Assert
                expect(result).toEqual<string[]>([]);
            });
        });

        describe('getCommandText()', () => {
            it('should return the command (cache, no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText(testCommandName);

                // Assert
                expect(result).toBe(testCommandText);
            });

            it('should return the command (cache, variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText(testCommandName, testVariant);

                // Assert
                expect(result).toBe(testCommandVariantText);
            });

            it('should return undefined for unknown variant (variant)', async () => {
                // Arrange
                const variant = 'unknownVariant';

                // Act
                const result = subject.getCommandText(testCommandName, variant);

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for invalid commandName', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandText('');

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for unknown command', () => {
                // Arrange
                const commandName = 'unknownCommandName';

                // Act
                const result = subject.getCommandText(commandName);

                // Assert
                expect(result).toBe(undefined);
            });
        });

        describe('updateCommandText()', () => {
            it(`should return 'invalidInput' with empty commandName`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.updateCommandText('', 'Valid text...');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });

            it(`should return 'invalidInput' with empty text`, async () => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.updateCommandText(validName, '');

                // Assert
                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });

            it(`should return 'notEditable' with unknown commandName`, async () => {
                // Arrange - beforeEach()
                const commandName = 'unknownCommandName';

                // Act
                const result = await subject.updateCommandText(commandName, validText);
                const cacheRecord = subject.getCommandText(commandName);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('notEditable');
                expect(cacheRecord).toBe(undefined);
            });

            it(`should return 'notEditable' with commandName and unknown variant`, async () => {
                // Arrange - beforeEach()
                const variant = 'unknownVariant';

                // Act
                const result = await subject.updateCommandText(testCommandName, validText, variant);
                const cacheRecord = subject.getCommandText(testCommandName, variant);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('notEditable');
                expect(cacheRecord).toBe(undefined);
            });

            it('row updated and gets new text (variant)', async () => {
                // Arrange
                mockCommandResponseRepository
                    .updateCommandText
                    .mockResolvedValue(true);

                // Act
                const result = await subject.updateCommandText(testCommandName, validText, testVariant);
                const cached = subject.getCommandText(testCommandName, testVariant);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('updated');
                expect(cached).toBe(validText);
            });

            it('row updated and gets new text (no-variant)', async () => {
                // Arrange
                mockCommandResponseRepository
                    .updateCommandText
                    .mockResolvedValue(true);

                // Act
                const result = await subject.updateCommandText(testCommandName, validText);
                const cached = subject.getCommandText(testCommandName);

                // Assert
                expect(result).toBe<CommandTextUpdateResult>('updated');
                expect(cached).toBe(validText);
            });

            it(`row update fails returning 'updateFailed'`, async () => {
                // Arrange
                mockCommandResponseRepository
                    .updateCommandText
                    .mockResolvedValue(false);

                // Act
                const result = await subject.updateCommandText(testCommandName, validText, testVariant);

                // Assert
                expect(mockLogger.warn)
                    .toHaveBeenCalledWith(expect.any(String));

                expect(result).toBe<CommandTextUpdateResult>('updateFailed');
            });

            it('invalid text (too short) rejected', async () => {
                // Arrange
                const badtext = 'BAD!';
                const validationError = new ValidationError(
                    'test-validation-error',
                    [],
                );

                mockCommandResponseRepository
                    .updateCommandText
                    .mockImplementation(() => { throw validationError; });

                // Act
                const result = await subject.updateCommandText(testCommandName, badtext);

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(testCommandName, badtext, '');

                expect(result).toBe<CommandTextUpdateResult>('invalidText');
            });

            it('non-validation error propagates', async () => {
                // Arrange
                mockCommandResponseRepository
                    .updateCommandText
                    .mockImplementation(() => { throw new Error('connection lost'); });

                // Act & Assert
                await expect(subject.updateCommandText(testCommandName, testCommandText))
                    .rejects.toThrow('connection lost');

                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(testCommandName, testCommandText, '');
            });
        });
    });

    describe('addCommandText()', () => {
        it(`should return 'invalidInput' with empty commandName`, async () => {
            // Arrange - beforeEach()
            // Act
            const result = await subject.addCommandText('', validText);

            // Assert
            expect(result).toBe<CommandTextValidationResult>('invalidInput');
        });

        it(`should return 'invalidInput' with empty text`, async () => {
            // Arrange - beforeEach()
            // Act
            const result = await subject.addCommandText(validName, '');

            // Assert
            expect(result).toBe<CommandTextValidationResult>('invalidInput');
        });

        it(`should return 'invalidCommandName' with an invalid command name`, async () => {
            // Arrange - beforeEach()
            // Act
            const unknownCommandName = 'UnknownCommandName';
            const result = await subject.addCommandText(unknownCommandName, validText, testVariant);

            // Assert
            expect(result).toBe<CommandTextInsertResult>('invalidCommandName');
        });

        it(`should return 'alreadyExists' for an existing command and variant`, async () => {
            // Arrange - beforeEach()
            mockCommandResponseRepository
                .findAll
                .mockResolvedValue([
                    testCommandResponse,
                    testCommandResponseVariant,
                ]);

            await subject.initialize();
            // Act
            const result = await subject.addCommandText(testCommandName, validText, testVariant);

            // Assert
            expect(result).toBe<CommandTextInsertResult>('alreadyExists');
        });

        it(`row 'inserted' and gets new text`, async () => {
            // Arrange - beforeEach()
            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([false, null]);

            mockCommandResponseRepository
                .addCommandText
                .mockResolvedValue(expect.anything());

            // Act
            const result = await subject.addCommandText(testCommandName, validText, defaultVariant);

            // Assert
            expect(mockCommandResponseRepository.restoreCommandText)
                .toHaveBeenCalledWith(testCommandName, defaultVariant);
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, validText, defaultVariant);

            expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    text: validText,
                }));

            expect(result).toBe<CommandTextInsertResult>('inserted');
        });

        it(`row 'inserted' and gets new text (restored)`, async () => {
            // Arrange - beforeEach()
            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([true, null]);

            mockCommandResponseRepository
                .updateCommandText
                .mockResolvedValue(expect.anything());

            // Act
            const result = await subject.addCommandText(testCommandName, validText, defaultVariant);

            // Assert
            expect(mockCommandResponseRepository.restoreCommandText)
                .toHaveBeenCalledWith(testCommandName, defaultVariant);
            expect(mockCommandResponseRepository.updateCommandText)
                .toHaveBeenCalledWith(testCommandName, validText, defaultVariant);

            expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    text: validText,
                }));

            expect(result).toBe<CommandTextInsertResult>('inserted');
        });

        it('invalid text (already exists) rejected', async () => {
            // Arrange
            const uniqueConstraintError = new UniqueConstraintError({
                message: 'test-unique-constraint-error',
            });

            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([false, null]);
            mockCommandResponseRepository
                .addCommandText
                .mockImplementation(() => { throw uniqueConstraintError; });

            // Act
            const result = await subject.addCommandText(testCommandName, testCommandText, testVariant);

            // Assert
            expect(mockCommandResponseRepository.restoreCommandText)
                .toHaveBeenCalledWith(testCommandName, testVariant);
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, testCommandText, testVariant);

            expect(result).toBe<CommandTextInsertResult>('alreadyExists');
        });

        it('invalid text (dbo validation failed) rejected', async () => {
            // Arrange
            const badtext = 'BAD!';
            const validationError = new ValidationError(
                'test-validation-error',
                [],
            );

            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([false, null]);

            mockCommandResponseRepository
                .addCommandText
                .mockImplementation(() => { throw validationError; });

            // Act
            const result = await subject.addCommandText(testCommandName, badtext);

            // Assert
            expect(mockCommandResponseRepository.restoreCommandText)
                .toHaveBeenCalledWith(testCommandName, '');
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, badtext, '');

            expect(result).toBe<CommandTextUpdateResult>('invalidText');
        });

        it('non-validation error propagates', async () => {
            // Arrange
            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([false, null]);

            mockCommandResponseRepository
                .addCommandText
                .mockImplementation(() => { throw new Error('connection lost'); });

            // Act & Assert
            await expect(subject.addCommandText(testCommandName, testCommandText, testVariant))
                .rejects.toThrow('connection lost');

            expect(mockCommandResponseRepository.restoreCommandText)
                .toHaveBeenCalledWith(testCommandName, testVariant);
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, testCommandText, testVariant);
        });
    });

    describe('removeCommandText()', () => {
        it(`should return 'invalidInput' with empty commandName`, async () => {
            // Arrange
            const commandName = '';

            // Act
            const result = await subject.removeCommandText(commandName, defaultVariant);

            // Assert
            expect(result).toBe<CommandTextValidationResult>('invalidInput');
        });

        it(`should return 'notFound' with unknown commandName`, async () => {
            // Arrange
            const commandName = 'unknownCommandName';

            // Act
            const result = await subject.removeCommandText(commandName, defaultVariant);

            // Assert
            expect(result).toBe<CommandTextRemoveResult>('notFound');
        });

        it(`should return 'notFound' with commandName and unknown variant`, async () => {
            // Arrange
            const variant = 'unknownVariant';

            // Act
            const result = await subject.removeCommandText(testCommandName, variant);

            // Assert
            expect(result).toBe<CommandTextRemoveResult>('notFound');
        });

        it('should remove record from database records and cache', async () => {
            // Arrange
            mockCommandResponseRepository
                .removeCommandText
                .mockResolvedValue(true);

            subject['responseCache'].set(cacheKey(testCommandName, defaultVariant), { variant: defaultVariant, text: testCommandText });

            // Act
            const result = await subject.removeCommandText(testCommandName, defaultVariant);
            const variants = subject.getCommandVariants(testCommandName);

            // Assert
            expect(mockCommandResponseRepository.removeCommandText)
                .toHaveBeenCalledWith(testCommandName, defaultVariant);

            expect(result).toBe<CommandTextRemoveResult>('removed');
            expect(variants).not.toEqual(expect.arrayContaining([
                testCommandText,
            ]));
        });

        it('should remove record from database records and cache', async () => {
            // Arrange
            mockCommandResponseRepository
                .removeCommandText
                .mockResolvedValue(false);

            subject['responseCache'].set(cacheKey(testCommandName, defaultVariant), { variant: defaultVariant, text: testCommandText });

            // Act
            const result = await subject.removeCommandText(testCommandName, defaultVariant);

            // Assert
            expect(mockCommandResponseRepository.removeCommandText)
                .toHaveBeenCalledWith(testCommandName, defaultVariant);
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String));

            expect(result).toBe<CommandTextRemoveResult>('removeFailed');
        });
    });

    describe('restoreCommandText()', () => {
        it(`should return 'invalidInput' with empty commandName`, async () => {
            // Arrange
            const commandName = '';

            // Act
            const result = await subject.restoreCommandText(commandName, defaultVariant);

            // Assert
            expect(result).toBe<CommandTextValidationResult>('invalidInput');
        });

        it(`should return 'alreadyActive' when command and variant is present in cache`, async () => {
            // Arrange
            subject['responseCache'].set(cacheKey(testCommandName, defaultVariant), { variant: defaultVariant, text: testCommandText });

            // Act
            const result = await subject.restoreCommandText(testCommandName, defaultVariant);

            // Assert
            expect(result).toBe<CommandTextRestoreResult>('alreadyActive');
        });

        it('should restore record in database records and cache (restored)', async () => {
            // Arrange
            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([true, testCommandResponseVariant]);

            // Act
            const result = await subject.restoreCommandText(testCommandName, testVariant);
            const cachedResult = subject.getCommandText(testCommandName, testVariant);

            // Assert
            expect(result).toBe<CommandTextRestoreResult>('restored');
            expect(cachedResult).toEqual(testCommandVariantText);
        });

        it('should return notFound when command/variant is not in the database or cache', async () => {
            // Arrange
            mockCommandResponseRepository
                .restoreCommandText
                .mockResolvedValue([false, null]);

            // Act
            const result = await subject.restoreCommandText(testCommandName, testVariant);

            // Assert
            expect(result).toBe<CommandTextRestoreResult>('notFound');
        });
    });
});
