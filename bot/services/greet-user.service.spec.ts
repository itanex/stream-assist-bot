import 'reflect-metadata';
import { jest } from '@jest/globals';
import { HelixStream } from '@twurple/api';
import { ChatUser } from '@twurple/chat';
import GreetUserService from './greet-user.service.js';
import { GreetedUserRepository } from '../repositories/index.js';
import Broadcaster from '../utilities/broadcaster.js';

const mockGreetedUserRepository = <unknown>{
    hasUser: jest.fn<GreetedUserRepository['hasUser']>(),
    saveUser: jest.fn<GreetedUserRepository['saveUser']>(),
} as jest.Mocked<GreetedUserRepository>;

const mockBroadcaster = <unknown>{
    getBroadcaster: jest.fn<Broadcaster['getBroadcaster']>(),
    getStream: jest.fn<Broadcaster['getStream']>(),
    isOnline: jest.fn<Broadcaster['isOnline']>(),
} as jest.Mocked<Broadcaster>;

describe('GreetUserService', () => {
    const basicUser = {
        userId: 1234,
        isMod: false,
        isVip: false,
    } as unknown as ChatUser;
    const unknownUserid = '8675309';
    const stream = <unknown>{
        id: 'test-stream-id',
    } as HelixStream;

    let subject: GreetUserService;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new GreetUserService(
            mockBroadcaster,
            mockGreetedUserRepository,
        );
    });

    describe('clear()', () => {
        it('Empties existing cache records', () => {
            // Arrange
            (subject as any).greetedUsers.add(basicUser.userId);

            // Act
            subject.clear();

            // Assert
            expect((subject as any).greetedUsers.size).toBe(0);
        });
    });

    describe('hasUser()', () => {
        it('offline stream returns false', async () => {
            // Arrange
            mockBroadcaster
                .getStream
                .mockResolvedValue(null);

            // Act
            const result = await subject.hasUser(basicUser);

            // Assert
            expect(mockBroadcaster.getStream)
                .toHaveBeenCalled();

            expect(result).toBe(false);
        });
        it('user is found in cache and in db', async () => {
            // Arrange
            (subject as any).greetedUsers.add(basicUser.userId);

            mockGreetedUserRepository
                .hasUser
                .mockResolvedValue(true);
            mockBroadcaster
                .getStream
                .mockResolvedValue(stream);

            // Act
            const result = await subject.hasUser(basicUser);

            // Assert
            expect(mockGreetedUserRepository.hasUser)
                .toHaveBeenCalledWith(basicUser, stream.id);

            expect(result).toBe(true);
        });

        it('user is not found in cache', async () => {
            // Arrange
            mockBroadcaster
                .getStream
                .mockResolvedValue(stream);

            (subject as any).greetedUsers.add(unknownUserid);

            // Act
            const result = await subject.hasUser(basicUser);

            // Assert
            expect(mockGreetedUserRepository.hasUser)
                .toHaveBeenCalledWith(basicUser, stream.id);

            expect(result).toBe(false);
        });

        it('user is not found in cache, but record is in DB (sync cache)', async () => {
            // Arrange
            (subject as any).greetedUsers.add(unknownUserid);

            mockGreetedUserRepository
                .hasUser
                .mockResolvedValue(true);

            mockBroadcaster
                .getStream
                .mockResolvedValue(stream);

            // Act
            const result = await subject.hasUser(basicUser);

            // Assert
            expect(mockGreetedUserRepository.hasUser)
                .toHaveBeenCalledWith(basicUser, stream.id);

            expect(result).toBe(true);
        });
    });

    describe('saveUser', () => {
        it('offline stream does not modify cache', async () => {
            // Arrange
            mockBroadcaster
                .getStream
                .mockResolvedValue(null);

            // Act
            const result = await subject.saveUser(basicUser);

            // Assert
            expect(mockBroadcaster.getStream)
                .toHaveBeenCalled();
            expect(mockGreetedUserRepository.saveUser)
                .not
                .toHaveBeenCalled();
            expect((subject as any).greetedUsers).not.toContain([basicUser.userId]);
        });
        it('Adds user to cache', async () => {
            // Arrange
            mockBroadcaster
                .getStream
                .mockResolvedValue(stream);

            // Act
            await subject.saveUser(basicUser);

            // Assert
            expect(mockGreetedUserRepository.saveUser)
                .toHaveBeenCalledWith(basicUser, stream.id);

            expect((subject as any).greetedUsers)
                .toContain(basicUser.userId);
        });
        it('Adding user twice to cache does not create multiple records', async () => {
            // Arrange
            mockBroadcaster
                .getStream
                .mockResolvedValue(stream);

            // Act
            await subject.saveUser(basicUser);
            await subject.saveUser(basicUser);

            // Assert
            expect(mockGreetedUserRepository.saveUser)
                .toHaveBeenCalledWith(basicUser, stream.id);

            expect((subject as any).greetedUsers.size).toBe(1);
            expect((subject as any).greetedUsers)
                .toContain(basicUser.userId);
        });
    });
});
