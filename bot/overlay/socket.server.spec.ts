import 'reflect-metadata';
import { Container } from 'inversify';
import winston from 'winston';
import { Server } from 'ws';
import { mockLogger } from '../../tests/common.mocks';
import InjectionTypes from '../../dependency-management/types';
import SocketServer from './socket.server';

jest.mock('ws', () => ({
    Server: jest.fn(),
    WebSocket: jest.fn(),
}));

jest.mock('../../configurations/environment', () => ({
    __esModule: true,
    default: {
        twitchBot: {
            websocket: {
                host: 'localhost',
                port: 8080,
            },
        },
    },
}));

describe('SocketServer', () => {
    let serverHandlers: Record<string, Function>;
    let mockServerInstance: { on: jest.Mock };

    beforeEach(() => {
        jest.resetAllMocks();

        serverHandlers = {};
        mockServerInstance = {
            on: jest.fn((event: string, handler: Function) => {
                serverHandlers[event] = handler;
            }),
        };

        jest.mocked(Server).mockImplementation(((_options: unknown, callback?: () => void) => {
            if (callback) callback();
            return mockServerInstance;
        }) as any);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function buildSubject(): SocketServer {
        const container = new Container();
        container.bind<winston.Logger>(InjectionTypes.Logger).toConstantValue(mockLogger);
        container.bind(SocketServer).to(SocketServer);
        return container.get(SocketServer);
    }

    function createMockWebSocket() {
        const wsHandlers: Record<string, Function> = {};
        return {
            on: jest.fn((event: string, handler: Function) => {
                wsHandlers[event] = handler;
            }),
            send: jest.fn(),
            handlers: wsHandlers,
        };
    }

    describe('startServer()', () => {
        it('starts the server on the configured port without modification', () => {
            // Arrange
            const subject = buildSubject();

            // Act
            subject.startServer();

            // Assert
            expect(jest.mocked(Server)).toHaveBeenCalledWith(
                expect.objectContaining({ port: 8080 }),
                expect.any(Function),
            );
        });

        it('starts the server on the configured host', () => {
            // Arrange
            const subject = buildSubject();

            // Act
            subject.startServer();

            // Assert
            expect(jest.mocked(Server)).toHaveBeenCalledWith(
                expect.objectContaining({ host: 'localhost' }),
                expect.any(Function),
            );
        });

        it('logs startup message containing the configured port', () => {
            // Arrange
            const subject = buildSubject();

            // Act
            subject.startServer();

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('8080'),
            );
        });
    });

    describe('connection handling', () => {
        it('tracks connected user so they receive broadcast messages', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs1 = createMockWebSocket();
            const mockWs2 = createMockWebSocket();
            serverHandlers.connection(mockWs1);
            serverHandlers.connection(mockWs2);

            // Act
            const msg = Buffer.from(JSON.stringify({ sender: 'test', body: 'hello' }));
            mockWs1.handlers.message(msg, false);

            // Assert
            expect(mockWs2.send).toHaveBeenCalledWith(expect.stringContaining('hello'));
        });

        it('removes user on close so they no longer receive broadcast messages', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs1 = createMockWebSocket();
            const mockWs2 = createMockWebSocket();
            serverHandlers.connection(mockWs1);
            serverHandlers.connection(mockWs2);

            // Act
            mockWs1.handlers.close(1000, Buffer.from('normal'));

            // Assert - probe with a message; mockWs1 should not receive it
            const msg = Buffer.from(JSON.stringify({ sender: 'test', body: 'hello' }));
            mockWs2.handlers.message(msg, false);

            expect(mockWs1.send).not.toHaveBeenCalled();
        });

        it('logs when a connection closes', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs = createMockWebSocket();
            serverHandlers.connection(mockWs);

            // Act
            mockWs.handlers.close(1000, Buffer.from('normal'));

            // Assert
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('closed'),
            );
        });
    });

    describe('message broadcasting', () => {
        it('broadcasts a valid message to all connected users', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs1 = createMockWebSocket();
            const mockWs2 = createMockWebSocket();
            serverHandlers.connection(mockWs1);
            serverHandlers.connection(mockWs2);

            // Act
            const msg = Buffer.from(JSON.stringify({ sender: 'TestSender', body: 'TestBody' }));
            mockWs1.handlers.message(msg, false);

            // Assert
            expect(mockWs1.send).toHaveBeenCalledWith(expect.stringContaining('TestBody'));
            expect(mockWs2.send).toHaveBeenCalledWith(expect.stringContaining('TestBody'));
        });

        it('logs error and does not broadcast when message is missing required fields', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs = createMockWebSocket();
            serverHandlers.connection(mockWs);

            // Act
            const msg = Buffer.from(JSON.stringify({ foo: 'bar' }));
            mockWs.handlers.message(msg, false);

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Invalid message'),
            );
            expect(mockWs.send).not.toHaveBeenCalled();
        });

        it('logs error when message cannot be parsed as JSON', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs = createMockWebSocket();
            serverHandlers.connection(mockWs);

            // Act
            const msg = Buffer.from('not valid json {');
            mockWs.handlers.message(msg, false);

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                expect.any(Error),
            );
        });
    });

    describe('error handling', () => {
        it('logs server-level errors', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const error = new Error('Server error');

            // Act
            serverHandlers.error(error);

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                error,
            );
        });

        it('logs websocket-level errors', () => {
            // Arrange
            const subject = buildSubject();
            subject.startServer();

            const mockWs = createMockWebSocket();
            serverHandlers.connection(mockWs);

            const error = new Error('WebSocket error');

            // Act
            mockWs.handlers.error(error);

            // Assert
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                error,
            );
        });
    });
});
