import { inject, injectable } from 'inversify';
import winston from 'winston';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { Dialect } from '@sequelize/core';
import { TYPES } from '../dependency-management/types';
import Raiders from './raiders.dto';
import LurkingUsers from './lurkingUser.dto';

// Option 1: Passing a connection URI
// const sequelize = new Sequelize('sqlite::memory:') // Example for sqlite
// const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname') // Example for postgres

// Option 2: Passing parameters separately (sqlite)
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: 'path/to/database.sqlite'
// });

// Option 3: Passing parameters separately (other dialects)
// const sequelize = new Sequelize('database', 'username', 'password', {
//   host: 'localhost',
//   dialect: /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */
// });

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
    models: [
        Raiders,
        LurkingUsers,
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
            .then(() => this.logger.info('Connection has been established successfully.'))
            .catch((error: any) => this.logger.error('**Unable to connect to the database**:', error));
    }

    async sync(): Promise<void> {
        await this.sequelize.sync()
            .then(obj => this.logger.info('Sync completed successfully', obj))
            .catch((error: any) => this.logger.error('**Sync Failed**:', error));
    }

    async validate(): Promise<void> {
        return this.sequelize.validate();
    }

    async disconnect(): Promise<void> {
        await this.sequelize
            .close()
            .then(() => {
                this.logger.info('All connections have been successfully closed.');
            })
            .catch((err: any) => {
                this.logger.error('There were issues disconnecting from the database:', err);
            });
    }
}
