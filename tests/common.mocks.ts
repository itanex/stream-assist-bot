import { jest } from '@jest/globals';
import { ApiClient, HelixChannelApi, HelixStreamApi, HelixUserApi } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import winston from 'winston';
import { CommandResponseService } from '../bot/services/index.js';

export const mockChatClient = <unknown>{
    say: jest.fn<ChatClient['say']>(),
} as jest.Mocked<ChatClient>;

export const mockApiClient = <unknown>{
    users: {
        getUserByName: jest.fn<HelixUserApi['getUserByName']>(),
        getUserById: jest.fn<HelixUserApi['getUserById']>(),
        getAuthenticatedUser: jest.fn<HelixUserApi['getAuthenticatedUser']>(),
    },
    streams: {
        getStreamByUserName: jest.fn<HelixStreamApi['getStreamByUserName']>(),
    },
    channels: {
        getChannelFollowers: jest.fn<HelixChannelApi['getChannelFollowers']>(),
    },
} as jest.Mocked<ApiClient> & {
    users: jest.Mocked<Pick<HelixUserApi, 'getUserByName' | 'getUserById' | 'getAuthenticatedUser'>>;
    streams: jest.Mocked<Pick<HelixStreamApi, 'getStreamByUserName'>>;
    channels: jest.Mocked<Pick<HelixChannelApi, 'getChannelFollowers'>>;
};

export const mockLogger = <unknown>{
    info: jest.fn<winston.Logger['info']>(),
    warn: jest.fn<winston.Logger['warn']>(),
    error: jest.fn<winston.Logger['error']>(),
} as jest.Mocked<winston.Logger>;

export const mockCommandResponseService = <unknown>{
    initialize: jest.fn<CommandResponseService['initialize']>(),
    addCommandText: jest.fn<CommandResponseService['addCommandText']>(),
    getCommandText: jest.fn<CommandResponseService['getCommandText']>(),
    updateCommandText: jest.fn<CommandResponseService['updateCommandText']>(),
    removeCommandText: jest.fn<CommandResponseService['removeCommandText']>(),
    restoreCommandText: jest.fn<CommandResponseService['restoreCommandText']>(),
} as jest.Mocked<CommandResponseService>;

/** Error mock for database error testing */
export const mockError = new Error('[Test Error Message]: Mock', {
    cause: 'Database Save Failed',
});
