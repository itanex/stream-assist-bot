import winston from 'winston';
import {
    TransientContext,
    TransientKeyword,
} from './default-responses';

// Twitch's chat message character cap
const MAX_MESSAGE_LENGTH = 500;

/**
 * Resolve a string from a template, replacing the tokens based on the context collection
 * @template - the template to operate on
 * @context - a key/value collection of the value to put in the template
 * @logger - the logger to use for any logging
 */
export const templateResolver = (
    template: string,
    context: TransientContext,
    logger: winston.Logger,
): string => {
    const resolved = template.replace(/%([a-z]+)%/gi, (match, key) => {
        const value = context?.[key?.toLowerCase() as TransientKeyword];

        if (value === undefined) {
            logger.warn(`Template token "${key}" has no matching context value`);
            return match;
        }

        return value;
    });

    if (resolved.length > MAX_MESSAGE_LENGTH) {
        logger.warn(`Resolved message length (${resolved.length}) exceeds the ${MAX_MESSAGE_LENGTH} character Twitch cap - truncating`);
        return `${resolved.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
    }

    return resolved;
};
