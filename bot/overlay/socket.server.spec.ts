import 'reflect-metadata';
import { jest } from '@jest/globals';
import { mockLogger } from '../../tests/common.mocks.js';

type WsModule = typeof import('ws');
type SocketServerModule = typeof import('./socket.server.js');

jest.unstable_mockModule('ws', () => ({
    WebSocketServer: jest.fn(),
    WebSocket: jest.fn(),
}));

jest.unstable_mockModule('../../configurations/environment.js', () => ({
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

    let mockWebSocketServer: jest.MockedClass<WsModule['WebSocketServer']>;

    let SocketServer: SocketServerModule['SocketServer'];
    let subject: InstanceType<SocketServerModule['SocketServer']>;

    beforeEach(async () => {
        jest.resetModules();
        jest.resetAllMocks();

        mockWebSocketServer = (await import('ws'))
            .WebSocketServer as jest.MockedClass<WsModule['WebSocketServer']>;

        ({ SocketServer } = await import('./socket.server.js'));

        subject = new SocketServer(
            mockLogger,
        );

        serverHandlers = {};

        mockWebSocketServer
            .mockImplementation(((_options: unknown, callback?: () => void) => {
                if (callback) callback();
                return mockWebSocketServer;
            }) as any);

        mockWebSocketServer.on = jest.fn((event: string, handler: Function) => {
            serverHandlers[event] = handler;
        }) as any;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

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
            // Act
            subject.startServer();

            // Assert
            expect(mockWebSocketServer).toHaveBeenCalledWith(
                expect.objectContaining({ port: 8080 }),
                expect.any(Function),
            );
        });

        it('starts the server on the configured host', () => {
            // Arrange
            // Act
            subject.startServer();

            // Assert
            expect(jest.mocked(mockWebSocketServer)).toHaveBeenCalledWith(
                expect.objectContaining({ host: 'localhost' }),
                expect.any(Function),
            );
        });

        it('logs startup message containing the configured port', () => {
            // Arrange
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
