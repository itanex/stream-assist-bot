import { ChatClient } from '@twurple/chat';
import winston from 'winston';

const mockChatClient: ChatClient = <unknown>{
    say: jest.fn(),
} as ChatClient;

const mockLogger: winston.Logger = <unknown>{
    info: jest.fn(),
} as winston.Logger;

export { mockChatClient, mockLogger };
