import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ChatUser } from '@twurple/chat';
import GreetUserService from './greet-user.service.js';

describe('GreetUserService', () => {
    const basicUser = {
        userId: 1234,
        isMod: false,
        isVip: false,
    } as unknown as ChatUser;
    const unknownUserid = '8675309';

    let subject: GreetUserService;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new GreetUserService();
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
        it('user is found in cache', () => {
            // Arrange
            (subject as any).greetedUsers.add(basicUser.userId);

            // Act
            const result = subject.hasUser(basicUser);

            // Assert
            expect(result).toBe(true);
        });

        it('user is not found in cache', () => {
            // Arrange
            (subject as any).greetedUsers.add(unknownUserid);

            // Act
            const result = subject.hasUser(basicUser);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('saveUser', () => {
        it('Adds user to cache', () => {
            // Arrange
            // Act
            subject.saveUser(basicUser);

            // Assert
            expect((subject as any).greetedUsers)
                .toContain(basicUser.userId);
        });
        it('Adding user twice to cache does not create multiple records', () => {
            // Arrange
            // Act
            subject.saveUser(basicUser);
            subject.saveUser(basicUser);

            // Assert
            expect((subject as any).greetedUsers.size).toBe(1);
            expect((subject as any).greetedUsers)
                .toContain(basicUser.userId);
        });
    });
});
