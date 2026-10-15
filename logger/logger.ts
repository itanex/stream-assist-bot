import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
    ),
});

const debugTransport: DailyRotateFile = new DailyRotateFile({
    level: 'debug',
    filename: './logs/%DATE%-debug.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
});

const infoTransport: DailyRotateFile = new DailyRotateFile({
    level: 'info',
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
        debugTransport,
    ],
});

// Passes errors, plus entries tagged for stdout (e.g. logger.child({ stdout: true }))
// Must run before colorize, which rewrites info.level with color codes
const errorOrStdout = winston.format(info => (info.level === 'error' || info.stdout ? info : false));

if (process.env.NODE_ENV !== 'production') {
    logger.add(consoleTransport);
} else {
    logger.add(new winston.transports.Console({
        level: 'warn',
        format: winston.format.combine(
            errorOrStdout(),
            winston.format.colorize(),
            winston.format.simple(),
        ),
    }));
}

export default logger;
