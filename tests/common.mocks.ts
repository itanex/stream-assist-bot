import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import winston from 'winston';
import PhraseService from '../bot/utilities/phrase.service';

export const mockChatClient: ChatClient = <unknown>{
    say: jest.fn(),
} as ChatClient;

export const mockApiClient: ApiClient = <unknown>{
    streams: {
        getStreamByUserName: jest.fn(),
    },
} as ApiClient;

export const mockLogger: winston.Logger = <unknown>{
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as winston.Logger;

export const mockPhraseService = <unknown>{
    initialize: jest.fn(),
    getCommandTemplate: jest.fn(),
    setCommandTemplate: jest.fn(),
} as jest.Mocked<PhraseService>;
