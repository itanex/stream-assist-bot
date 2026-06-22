import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const sqlTransport: DailyRotateFile = new DailyRotateFile({
    level: 'debug',
    filename: './logs/%DATE%-sql.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
});

const sqlLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
    ),
    transports: [
        sqlTransport,
    ],
});

export default sqlLogger;
