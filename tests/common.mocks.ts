import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import winston from 'winston';
import PhraseService from '../bot/utilities/phrase.service';

export const mockChatClient = <unknown>{
    say: jest.fn(),
} as jest.Mocked<ChatClient>;

export const mockApiClient = <unknown>{
    streams: {
        getStreamByUserName: jest.fn(),
    },
} as jest.Mocked<ApiClient>;

export const mockLogger = <unknown>{
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as jest.Mocked<winston.Logger>;

export const mockPhraseService = <unknown>{
    initialize: jest.fn(),
    getCommandTemplate: jest.fn(),
    setCommandTemplate: jest.fn(),
} as jest.Mocked<PhraseService>;
