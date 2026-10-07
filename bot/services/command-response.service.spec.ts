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
import { CommandResponseRepository } from '../repositories/index.js';
import { type CommandResponse, type CommandResponseTextChanges } from '../repositories/command-response.repository.js';

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
    const testCommandResponse: CommandResponse = {
        commandName: testCommandName,
        variant: '',
        texts: [{
            id: 0,
            text: testCommandText,
            weight: 1,
        }],
    };
    const testCommandResponseVariant: CommandResponse = {
        commandName: testCommandName,
        variant: testVariant,
        texts: [{
            id: 0,
            text: testCommandVariantText,
            weight: 1,
        }],
    };

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
                    responses: [testCommandText],
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

        describe('getCommandResponse()', () => {
            it('should return the command (cache, no-variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandResponse(testCommandName, defaultVariant);

                // Assert
                expect(result).toBe(testCommandText);
            });

            it('should return the command (cache, variant)', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandResponse(testCommandName, testVariant);

                // Assert
                expect(result).toBe(testCommandVariantText);
            });

            it('should return undefined for unknown variant (variant)', async () => {
                // Arrange
                const variant = 'unknownVariant';

                // Act
                const result = subject.getCommandResponse(testCommandName, variant);

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for invalid commandName', () => {
                // Arrange - beforeEach()
                // Act
                const result = subject.getCommandResponse('', defaultVariant);

                // Assert
                expect(result).toBe(undefined);
            });

            it('should return undefined for unknown command', () => {
                // Arrange
                const commandName = 'unknownCommandName';

                // Act
                const result = subject.getCommandResponse(commandName, defaultVariant);

                // Assert
                expect(result).toBe(undefined);
            });
        });

        describe('updateCommandText()', () => {
            it.each`
                scenario                       | commandName        | changes
                ${'empty commandName'}         | ${''}              | ${{ text: validText }}
                ${'no changes'}                | ${testCommandName} | ${{}}
                ${'empty text with weight'}    | ${testCommandName} | ${{ text: '', weight: 5 }}
            `(`should return 'invalidInput' with $scenario`, async ({ commandName, changes }: { commandName: string, changes: CommandResponseTextChanges }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.updateCommandText(commandName, defaultVariant, 0, changes);

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });

            it.each`
                scenario                       | commandName              | variant             | id
                ${'no cache record'}           | ${'unknownCommandName'}  | ${defaultVariant}   | ${0}
                ${'unknown id'}                | ${testCommandName}       | ${defaultVariant}   | ${99}
            `(`should return 'notEditable' with $scenario`, async ({ commandName, variant, id }: { commandName: string, variant: string, id: number }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.updateCommandText(commandName, variant, id, { text: validText });

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextUpdateResult>('notEditable');
            });

            it.each`
                scenario                       | changes
                ${'text change'}               | ${{ text: validText }}
                ${'weight-only change (0)'}    | ${{ weight: 0 }}
            `(`row 'updated' and replaces cached text with $scenario`, async ({ changes }: { changes: CommandResponseTextChanges }) => {
                // Arrange
                const [seededText] = testCommandResponse.texts;
                const updatedText = { ...seededText, ...changes };

                mockCommandResponseRepository
                    .findAll
                    .mockResolvedValue([
                        { ...testCommandResponse, texts: [...testCommandResponse.texts] },
                        testCommandResponseVariant,
                    ]);

                await subject.initialize();

                mockCommandResponseRepository
                    .updateCommandText
                    .mockResolvedValue(updatedText);

                // Act
                const result = await subject.updateCommandText(testCommandName, defaultVariant, seededText.id, changes);

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(seededText.id, changes);

                expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                    .toEqual(expect.objectContaining({
                        variant: defaultVariant,
                        responses: [updatedText],
                    }));

                expect(result).toBe<CommandTextUpdateResult>('updated');
            });

            it(`row update fails returning 'updateFailed'`, async () => {
                // Arrange
                const [seededText] = testCommandResponse.texts;
                const changes = { text: validText };

                mockCommandResponseRepository
                    .updateCommandText
                    .mockResolvedValue(null);

                // Act
                const result = await subject.updateCommandText(testCommandName, defaultVariant, seededText.id, changes);

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(seededText.id, changes);
                expect(mockLogger.warn)
                    .toHaveBeenCalledWith(expect.any(String));

                expect(result).toBe<CommandTextUpdateResult>('updateFailed');
            });

            it.each`
                scenario                       | error                                                                    | expected
                ${'ValidationError'}           | ${new ValidationError('test-validation-error', [])}                      | ${'invalidText'}
                ${'UniqueConstraintError'}     | ${new UniqueConstraintError({ message: 'test-unique-constraint-error' })} | ${'alreadyExists'}
            `(`database $scenario returns '$expected'`, async ({ error, expected }: { error: Error, expected: CommandTextUpdateResult }) => {
                // Arrange
                const [seededText] = testCommandResponse.texts;
                const changes = { text: 'test-reliable-text' };

                mockCommandResponseRepository
                    .updateCommandText
                    .mockImplementation(() => { throw error; });

                // Act
                const result = await subject.updateCommandText(testCommandName, defaultVariant, seededText.id, changes);

                // Assert
                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(seededText.id, changes);

                expect(result).toBe<CommandTextUpdateResult>(expected);
            });

            it('non-validation error propagates', async () => {
                // Arrange
                const [seededText] = testCommandResponse.texts;
                const changes = { text: validText };

                mockCommandResponseRepository
                    .updateCommandText
                    .mockImplementation(() => { throw new Error('connection lost'); });

                // Act & Assert
                await expect(subject.updateCommandText(testCommandName, defaultVariant, seededText.id, changes))
                    .rejects.toThrow('connection lost');

                expect(mockCommandResponseRepository.updateCommandText)
                    .toHaveBeenCalledWith(seededText.id, changes);
            });
        });

        describe('removeCommandText()', () => {
            it.each`
                scenario                       | commandName        | id
                ${'empty commandName'}         | ${''}              | ${0}
                ${'undefined id'}              | ${testCommandName} | ${undefined}
            `(`should return 'invalidInput' with $scenario`, async ({ commandName, id }: { commandName: string, id: number }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText(commandName, defaultVariant, id);

                // Assert
                expect(mockCommandResponseRepository.removeCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });

            it.each`
                scenario                       | commandName              | variant              | id
                ${'no cache record'}           | ${'unknownCommandName'}  | ${defaultVariant}    | ${0}
                ${'unknown variant'}           | ${testCommandName}       | ${'unknownVariant'}  | ${0}
                ${'unknown id'}                | ${testCommandName}       | ${defaultVariant}    | ${99}
            `(`should return 'notFound' with $scenario`, async ({ commandName, variant, id }: { commandName: string, variant: string, id: number }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.removeCommandText(commandName, variant, id);

                // Assert
                expect(mockCommandResponseRepository.removeCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextRemoveResult>('notFound');
            });

            it.each`
                scenario                       | fixture
                ${'no-variant'}                | ${testCommandResponse}
                ${'variant'}                   | ${testCommandResponseVariant}
            `(`row 'removed' and removes cached text with $scenario`, async ({ fixture }: { fixture: CommandResponse }) => {
                // Arrange
                const [seededText] = fixture.texts;

                mockCommandResponseRepository
                    .findAll
                    .mockResolvedValue([
                        { ...testCommandResponse, texts: [...testCommandResponse.texts] },
                        { ...testCommandResponseVariant, texts: [...testCommandResponseVariant.texts] },
                    ]);

                await subject.initialize();

                mockCommandResponseRepository
                    .removeCommandText
                    .mockResolvedValue(true);

                // Act
                const result = await subject.removeCommandText(testCommandName, fixture.variant, seededText.id);

                // Assert
                expect(mockCommandResponseRepository.removeCommandText)
                    .toHaveBeenCalledWith(seededText.id);

                expect(subject['responseCache'].get(cacheKey(testCommandName, fixture.variant)))
                    .toEqual(expect.objectContaining({
                        variant: fixture.variant,
                        responses: [],
                    }));

                expect(result).toBe<CommandTextRemoveResult>('removed');
            });

            it(`row remove fails returning 'removeFailed'`, async () => {
                // Arrange
                const [seededText] = testCommandResponse.texts;

                mockCommandResponseRepository
                    .removeCommandText
                    .mockResolvedValue(false);

                // Act
                const result = await subject.removeCommandText(testCommandName, defaultVariant, seededText.id);

                // Assert
                expect(mockCommandResponseRepository.removeCommandText)
                    .toHaveBeenCalledWith(seededText.id);
                expect(mockLogger.warn)
                    .toHaveBeenCalledWith(expect.any(String));

                expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                    .toEqual(expect.objectContaining({
                        variant: defaultVariant,
                        responses: [seededText],
                    }));

                expect(result).toBe<CommandTextRemoveResult>('removeFailed');
            });
        });

        describe('restoreCommandText()', () => {
            const restoredText = {
                id: 1,
                text: 'test-restored-text',
                weight: 1,
            };

            it.each`
                scenario                       | commandName        | id
                ${'empty commandName'}         | ${''}              | ${restoredText.id}
                ${'undefined id'}              | ${testCommandName} | ${undefined}
            `(`should return 'invalidInput' with $scenario`, async ({ commandName, id }: { commandName: string, id: number }) => {
                // Arrange - beforeEach()
                // Act
                const result = await subject.restoreCommandText(commandName, defaultVariant, id);

                // Assert
                expect(mockCommandResponseRepository.restoreCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextValidationResult>('invalidInput');
            });

            it.each`
                scenario                       | fixture
                ${'no-variant'}                | ${testCommandResponse}
                ${'variant'}                   | ${testCommandResponseVariant}
            `(`should return 'alreadyActive' with active text in cache ($scenario)`, async ({ fixture }: { fixture: CommandResponse }) => {
                // Arrange - beforeEach()
                const [seededText] = fixture.texts;

                // Act
                const result = await subject.restoreCommandText(testCommandName, fixture.variant, seededText.id);

                // Assert
                expect(mockCommandResponseRepository.restoreCommandText)
                    .not.toHaveBeenCalled();

                expect(result).toBe<CommandTextRestoreResult>('alreadyActive');
            });

            it.each`
                scenario                       | variant              | expected
                ${'existing cache entry'}      | ${defaultVariant}    | ${[...testCommandResponse.texts, restoredText]}
                ${'no cache entry'}            | ${'unseededVariant'} | ${[restoredText]}
            `(`row 'restored' and adds cached text with $scenario`, async ({ variant, expected }: { variant: string, expected: CommandResponse['texts'] }) => {
                // Arrange
                mockCommandResponseRepository
                    .findAll
                    .mockResolvedValue([
                        { ...testCommandResponse, texts: [...testCommandResponse.texts] },
                        { ...testCommandResponseVariant, texts: [...testCommandResponseVariant.texts] },
                    ]);

                await subject.initialize();

                mockCommandResponseRepository
                    .restoreCommandText
                    .mockResolvedValue(restoredText);

                // Act
                const result = await subject.restoreCommandText(testCommandName, variant, restoredText.id);

                // Assert
                expect(mockCommandResponseRepository.restoreCommandText)
                    .toHaveBeenCalledWith(testCommandName, variant, restoredText.id);

                expect(subject['responseCache'].get(cacheKey(testCommandName, variant)))
                    .toEqual(expect.objectContaining({
                        variant,
                        responses: expected,
                    }));

                expect(result).toBe<CommandTextRestoreResult>('restored');
            });

            it(`row restore fails returning 'notFound'`, async () => {
                // Arrange
                mockCommandResponseRepository
                    .restoreCommandText
                    .mockResolvedValue(null);

                // Act
                const result = await subject.restoreCommandText(testCommandName, defaultVariant, restoredText.id);

                // Assert
                expect(mockCommandResponseRepository.restoreCommandText)
                    .toHaveBeenCalledWith(testCommandName, defaultVariant, restoredText.id);

                expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                    .toEqual(expect.objectContaining({
                        variant: defaultVariant,
                        responses: testCommandResponse.texts,
                    }));

                expect(result).toBe<CommandTextRestoreResult>('notFound');
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

        it(`should return 'insertFailed' when repo returns null`, async () => {
            // Arrange
            mockCommandResponseRepository
                .addCommandText
                .mockResolvedValue(null);

            // Act
            const result = await subject.addCommandText(testCommandName, validText, testVariant);

            // Assert
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, validText, testVariant);

            expect(result).toBe('insertFailed');
        });

        it(`row 'inserted' and creates cache entry for new command/variant`, async () => {
            // Arrange - beforeEach()
            mockCommandResponseRepository
                .addCommandText
                .mockResolvedValue({
                    commandName: testCommandName,
                    variant: defaultVariant,
                    texts: [{
                        id: 0,
                        text: validText,
                        weight: 1,
                    }],
                });

            // Act
            const result = await subject.addCommandText(testCommandName, validText, defaultVariant);

            // Assert
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, validText, defaultVariant);

            expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    responses: [{
                        id: 0,
                        text: validText,
                        weight: 1,
                    }],
                }));

            expect(result).toBe<CommandTextInsertResult>('inserted');
        });

        it(`row 'inserted' and appends text to existing cache entry`, async () => {
            // Arrange - beforeEach()
            const addedText = {
                id: 1,
                text: validText,
                weight: 1.5,
            };
            mockCommandResponseRepository
                .addCommandText
                .mockResolvedValue({
                    commandName: testCommandName,
                    variant: defaultVariant,
                    texts: [addedText],
                });

            mockCommandResponseRepository
                .findAll
                .mockResolvedValue([
                    { ...testCommandResponse, texts: [...testCommandResponse.texts] },
                    testCommandResponseVariant,
                ]);

            await subject.initialize();

            // Act
            const result = await subject.addCommandText(testCommandName, validText, defaultVariant);

            // Assert
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, validText, defaultVariant);

            expect(subject['responseCache'].get(cacheKey(testCommandName, defaultVariant)))
                .toEqual(expect.objectContaining({
                    variant: defaultVariant,
                    responses: [
                        ...testCommandResponse.texts,
                        addedText,
                    ],
                }));

            expect(result).toBe<CommandTextInsertResult>('inserted');
        });

        it('invalid text (already exists) rejected', async () => {
            // Arrange
            const uniqueConstraintError = new UniqueConstraintError({
                message: 'test-unique-constraint-error',
            });

            mockCommandResponseRepository
                .addCommandText
                .mockImplementation(() => { throw uniqueConstraintError; });

            // Act
            const result = await subject.addCommandText(testCommandName, testCommandText, testVariant);

            // Assert
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
                .addCommandText
                .mockImplementation(() => { throw validationError; });

            // Act
            const result = await subject.addCommandText(testCommandName, badtext);

            // Assert
            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, badtext, '');

            expect(result).toBe<CommandTextUpdateResult>('invalidText');
        });

        it('non-validation error propagates', async () => {
            // Arrange
            mockCommandResponseRepository
                .addCommandText
                .mockImplementation(() => { throw new Error('connection lost'); });

            // Act & Assert
            await expect(subject.addCommandText(testCommandName, testCommandText, testVariant))
                .rejects.toThrow('connection lost');

            expect(mockCommandResponseRepository.addCommandText)
                .toHaveBeenCalledWith(testCommandName, testCommandText, testVariant);
        });
    });
});
