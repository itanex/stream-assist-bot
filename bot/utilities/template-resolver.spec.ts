import { mockLogger } from '../../tests/common.mocks';
import { templateResolver } from './template-resolver';
import { TransientContext } from './default-responses';

describe('templateResolver', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('substitutes a token with its context value', () => {
        // Arrange
        const template = '%speakinguser% cuddles %targetuser%';
        const context: TransientContext = {
            speakinguser: 'Alice',
            targetuser: 'Bob',
        };

        // Act
        const result = templateResolver(template, context, mockLogger);

        // Assert
        expect(result).toBe('Alice cuddles Bob');
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('leaves an unmatched token in place and logs a warning', () => {
        // Arrange
        const template = 'Hello %speakinguser%';
        const context: TransientContext = {};

        // Act
        const result = templateResolver(template, context, mockLogger);

        // Assert
        expect(result).toBe('Hello %speakinguser%');
        expect(mockLogger.warn)
            .toHaveBeenCalledWith(expect.stringContaining('speakinguser'));
    });

    it('returns the resolved message unchanged when exactly at the 500-character cap', () => {
        // Arrange
        const context: TransientContext = { speakinguser: 'A'.repeat(500) };
        const template = '%speakinguser%';

        // Act
        const result = templateResolver(template, context, mockLogger);

        // Assert
        expect(result).toHaveLength(500);
        expect(result).toBe('A'.repeat(500));
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('truncates a resolved message over the 500-character Twitch cap and logs a warning', () => {
        // Arrange
        const context: TransientContext = { speakinguser: 'A'.repeat(600) };
        const template = '%speakinguser%';

        // Act
        const result = templateResolver(template, context, mockLogger);

        // Assert
        expect(result).toHaveLength(500);
        expect(result.endsWith('...')).toBe(true);
        expect(result.startsWith('A'.repeat(497))).toBe(true);
        expect(mockLogger.warn)
            .toHaveBeenCalledWith(expect.stringContaining('exceeds the 500 character'));
    });
});
