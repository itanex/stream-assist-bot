import { jest } from '@jest/globals';
import { ApiClient, HelixChannelApi, HelixStreamApi, HelixUserApi } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import winston from 'winston';
import CommandResponseRepository from '../bot/repositories/command-response.repository.js';

export const mockChatClient = <unknown>{
    say: jest.fn(),
} as jest.Mocked<ChatClient>;

export const mockApiClient = <unknown>{
    users: {
        getUserByName: jest.fn(),
        getUserById: jest.fn(),
        getAuthenticatedUser: jest.fn(),
    },
    streams: {
        getStreamByUserName: jest.fn(),
    },
    channels: {
        getChannelFollowers: jest.fn(),
    },
} as jest.Mocked<ApiClient> & {
    users: jest.Mocked<Pick<HelixUserApi, 'getUserByName' | 'getUserById' | 'getAuthenticatedUser'>>;
    streams: jest.Mocked<Pick<HelixStreamApi, 'getStreamByUserName'>>;
    channels: jest.Mocked<Pick<HelixChannelApi, 'getChannelFollowers'>>;
};

export const mockLogger = <unknown>{
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as jest.Mocked<winston.Logger>;

export const mockCommandResponseRepository = <unknown>{
    initialize: jest.fn(),
    addCommandText: jest.fn(),
    getCommandText: jest.fn(),
    setCommandText: jest.fn(),
    removeCommandText: jest.fn(),
    restoreCommandText: jest.fn(),
} as jest.Mocked<CommandResponseRepository>;
