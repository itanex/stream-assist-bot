import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
    ),
});

const infoTransport: DailyRotateFile = new DailyRotateFile({
    level: 'debug',
    filename: './logs/%DATE%-info.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
});

const errorTransport: DailyRotateFile = new DailyRotateFile({
    level: 'error',
    filename: './logs/%DATE%-error.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
    ),
    transports: [
        errorTransport,
        infoTransport,
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(consoleTransport);
}

export default logger;
