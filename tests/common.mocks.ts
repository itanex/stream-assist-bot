import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import winston from 'winston';
import CommandResponseService from '../bot/utilities/command-response.service';

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

export const mockCommandResponseService = <unknown>{
    initialize: jest.fn(),
    addCommandText: jest.fn(),
    getCommandText: jest.fn(),
    setCommandText: jest.fn(),
    removeCommandText: jest.fn(),
} as jest.Mocked<CommandResponseService>;
