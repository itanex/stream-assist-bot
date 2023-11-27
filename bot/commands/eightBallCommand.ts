import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import fs from 'fs';
import { getAudioBase64 } from 'google-tts-api';
import path from 'path';
import md5 from 'md5';
import sound from 'sound-play';
import ICommandHandler from './iCommandHandler';
import { TYPES } from '../../dependency-management/types';

const responses = [
    `It is certain.`,
    `It is decidedly so.`,
    `Without a doubt.`,
    `Yes definitely.`,
    `You may rely on it.`,
    `As I see it, yes.`,
    `Most likely.`,
    `Outlook good.`,
    `Yes.`,
    `Signs point to yes.`,
    `Reply hazy, try again.`,
    `Ask again later.`,
    `Better not tell you now.`,
    `Cannot predict now.`,
    `Concentrate and ask again.`,
    `Don't count on it.`,
    `My reply is no.`,
    `My sources say no.`,
    `Outlook not so good.`,
    `Very doubtful.`,
    // `sure`,
    // `are you kidding?!`,
    // `yeah`,
    // `no`,
    // `i think so`,
    // `don't bet on it`,
    // `ja`,
    // `doubtful`,
    // `for sure`,
    // `forget about it`,
    // `nein`,
    // `maybe`,
    // `Kappa Keepo PogChamp`,
    // `sure`,
    // `i don't think so`,
    // `it is so`,
    // `leaning towards no`,
    // `look deep in your heart and you will see the answer`,
    // `most definitely`,
    // `most likely`,
    // `my sources say yes`,
    // `never`,
    // `nah m8`,
    // `might actually be yes`,
    // `no.`,
    // `outlook good`,
    // `outlook not so good`,
    // `perhaps`,
    // `mayhaps`,
    // `that's a tough one`,
    // `idk kev`,
    // `don't ask that`,
    // `the answer to that isn't pretty`,
    // `the heavens point to yes`,
    // `who knows?`,
    // `without a doubt`,
    // `yesterday it would've been a yes, but today it's a yep`,
    // `you will have to wait`,
];

@injectable()
export class EightBallCommand implements ICommandHandler {
    exp: RegExp = /^!(8ball|eightball|magic 8ball) (.*)$/i;
    timeout: number = 30;
    mod: boolean = true;
    vip: boolean = true;
    subscriber: boolean = true;
    follower: boolean = true;
    viewer: boolean = true;
    isGlobalCommand: boolean = true;

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
    }

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        if (responses.length) {
            const answer = responses[Math.floor(Math.random() * responses.length)];
            const rootPath = `local-cache/audio/8ball`;
            const filePath = `${rootPath}/${md5(answer)}.en.mp3`;

            if (!fs.existsSync(filePath)) {
                getAudioBase64(answer, {
                    lang: 'en',
                    slow: false,
                    host: 'https://translate.google.com',
                })
                    .then(base64 => {
                        const buffer = Buffer.from(base64, 'base64');
                        this.generateFile(buffer, rootPath, filePath);

                        this.logger.info(`* Generated file: ${filePath} :: ${EightBallCommand}`);
                    });
            }

            this.playAudioFile(filePath);

            this.chatClient.say(channel, answer);

            this.logger.info(`* Executed ${commandName} in ${channel} :: ${userstate.displayName} > ${message}`);
        }
    }

    private generateFile(buffer: Buffer, rootPath: string, filePath: string) {
        if (!fs.existsSync(filePath)) {
            if (!fs.existsSync(rootPath)) {
                fs.mkdirSync(rootPath, { recursive: true });
            }

            fs.writeFileSync(filePath, buffer, { encoding: 'base64' });
        }
    }

    private playAudioFile(filePath: string) {
        const dirname = path.resolve();
        const audioFile = path.join(dirname, filePath);

        sound.play(audioFile, 100);
    }
}
