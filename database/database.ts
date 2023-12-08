import { inject, injectable } from 'inversify';
import winston from 'winston';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { Dialect } from '@sequelize/core';
import { TYPES } from '../dependency-management/types';
import {
    DeathCounts,
    LurkingUsers,
    Raiders,
    SubscriptionGiftUsers,
    Subscribers,
} from '.';

const databaseName = 'StreamAssistBot';
const dbUsername = 'stream-assist-bot';
const dbPassword = 'stream-assist-bot';

/**
 * which sequelize dialect to use
 */
const dbDialect: Dialect = 'postgres';

/**
 * Connection information for Postgres,
 * sequelize syntax
 */
const pgConfig: SequelizeOptions = {
    database: 'pg-prototype',
    username: 'postgres',
    password: 'Vsnyi&FN^oLXUVqdjm9v4',
    host: 'localhost',
    dialect: dbDialect,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    logging: false,
    models: [
        Raiders,
        LurkingUsers,
        DeathCounts,
        Subscribers,
        SubscriptionGiftUsers,
    ],
};

@injectable()
export default class Database {
    private sequelize: Sequelize;

    get db(): Sequelize {
        return this.sequelize;
    }

    constructor(
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        this.sequelize = new Sequelize(pgConfig);
    }

    async connect(): Promise<void> {
        await this.validate()
            .then(() => this.logger.info('DB Connection has been established successfully.'))
            .catch((error: any) => this.logger.error('**Unable to connect to the database**:', error));
    }

    async sync(): Promise<void> {
        await this.sequelize.sync({ logging: false })
            .then(obj => this.logger.info('DB Sync completed successfully'))
            .catch((error: any) => this.logger.error('**DB Sync Failed**:', error));
    }

    async validate(): Promise<void> {
        return this.sequelize.validate();
    }

    async disconnect(): Promise<void> {
        await this.sequelize
            .close()
            .then(() => {
                this.logger.info('All DB connections have been successfully closed.');
            })
            .catch((err: any) => {
                this.logger.error('There were issues disconnecting from the database:', err);
            });
    }
}
