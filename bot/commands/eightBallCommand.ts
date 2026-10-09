import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import fs from 'fs';
import axios from 'axios';
import md5 from 'md5';
import { WebSocket } from 'ws';
import { ICommandHandler, OnlineState } from './iCommandHandler.js';
import InjectionTypes from '../../dependency-management/types.js';
import environment from '../../configurations/environment.js';
import { CommandName } from '../utilities/default-responses.js';
import { CommandResponseService } from '../services/index.js';

@injectable()
export class EightBallCommand implements ICommandHandler {
    exp: RegExp = /^!(8ball|eightball|magic 8ball) (.*)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    artist: boolean = false;
    founder: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';
    commandName: CommandName = 'eightball';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(CommandResponseService) private commandResponseService: CommandResponseService,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        const commandText = this.commandResponseService
            .getCommandResponse(this.commandName, '');

        if (commandText) {
            const rootPath = `local-cache/audio/8ball`;
            const fileHash = md5(commandText);
            const langCode = 'en';
            const filePath = `${rootPath}/${fileHash}.${langCode}.mp3`;

            try {
                if (!this.fileExists(filePath)) {
                    const data = await this.getAudioFromGoogleTTS(commandText);
                    const buffer = Buffer.from(data, 'base64');

                    this.generateFile(buffer, rootPath, filePath);

                    this.logger.info(`* Generated file: ${filePath} :: ${EightBallCommand}`);
                }
            } catch (e) {
                this.logger.error(`Failed to access or generate file.`, e);
                return;
            }

            this.broadcastAudio(command, fileHash, langCode);

            await this.chatClient.say(channel, commandText);
        } else {
            this.logger.warn(`Unable to retrieve ${this.commandName} response text`, { variant: '' });
        }

        this.logger.info(`* Executed ${command} in ${channel} :: ${userstate.displayName} > ${message}`);
    }

    private fileExists(filePath: fs.PathLike): boolean {
        return fs.existsSync(filePath);
    }

    private async getAudioFromGoogleTTS(content: string): Promise<string> {
        const payload = `f.req=${encodeURIComponent(
            JSON.stringify([[['jQ1olc', JSON.stringify([content, 'en', null, 'null']), null, 'generic']]]),
        )}`;
        const res = await axios.post(
            'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute',
            payload,
            {
                timeout: 20000,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
        );
        const outer = JSON.parse(res.data.slice(5));
        const audio = JSON.parse(outer[0][2])?.[0];
        if (!audio) throw new Error('Google TTS returned no audio data');
        return audio;
    }

    private generateFile(buffer: Buffer, rootPath: string, filePath: string): void {
        if (!this.fileExists(filePath)) {
            if (!this.fileExists(rootPath)) {
                fs.mkdirSync(rootPath, { recursive: true });
            }

            fs.writeFileSync(filePath, buffer, { encoding: 'base64' });
        }
    }

    private broadcastAudio(command: string, hash: string, lang: string): void {
        const ws = new WebSocket(`ws://${environment.twitchBot.websocket.host}:${environment.twitchBot.websocket.port}/`);

        const messageToSend = {
            sender: command,
            body: `!play ${hash} ${lang}`,
            sentAt: Date.now(),
        };

        ws.onopen = () => {
            ws.send(JSON.stringify(messageToSend));
            ws.close();
        };
    }
}
