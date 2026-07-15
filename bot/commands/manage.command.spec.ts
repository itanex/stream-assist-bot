import 'reflect-metadata';
import { ChatUser } from '@twurple/chat';
import ManageCommand, { replies } from './manage.command';
import { mockChatClient, mockLogger } from '../../tests/common.mocks';
import PhraseService, { PhraseUpdateResult } from '../utilities/phrase.service';

describe('ManageCommand', () => {
    const channel = 'TestChannel';
    const command = 'TestCommand';
    const user = <ChatUser>{
        displayName: 'TestUser',
    };

    const mockSetCommandTemplate = jest.fn();
    const mockPhraseService = <unknown>{
        setCommandTemplate: mockSetCommandTemplate,
    } as PhraseService;

    let subject: ManageCommand;

    beforeEach(() => {
        jest.resetAllMocks();

        subject = new ManageCommand(
            mockChatClient,
            mockPhraseService,
            mockLogger,
        );
    });

    it.each(Object.keys(replies) as PhraseUpdateResult[])(
        'replies correctly for %s result',
        async result => {
            // Arrange
            const updateCommand = 'CommandToUpdate';
            const updateTemplate = 'TestTemplate';
            const message = `!command edit ${updateCommand} ${updateTemplate}`;
            const args: any[] = [
                updateCommand,
                updateTemplate,
            ];

            mockSetCommandTemplate.mockReturnValue(result);

            // Act
            await subject.handle(channel, command, user, message, args);

            // Assert
            expect(mockSetCommandTemplate).toHaveBeenCalledWith(updateCommand, updateTemplate);
            expect(mockChatClient.say).toHaveBeenCalledWith(channel, replies[result](updateCommand));
        },
    );

    it('propagates unexpected service errors without replying', async () => {
        // Arrange
        const message = '!command edit about some new template';
        const args = ['about', 'some new template'];

        mockSetCommandTemplate.mockRejectedValue(new Error('connection lost'));

        // Act & Assert
        await expect(subject.handle(channel, command, user, message, args))
            .rejects.toThrow('connection lost');

        expect(mockChatClient.say).not.toHaveBeenCalled();
    });
});
