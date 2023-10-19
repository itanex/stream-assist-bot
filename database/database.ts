import { Sequelize, Options } from 'sequelize';
import { inject, injectable } from 'inversify';
import winston from 'winston';
import { TYPES } from '../dependency-management/types';

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

@injectable()
export default class Database {
    private databaseName = 'StreamAssistBot';
    private username = 'stream-assist-bot';
    private password = 'stream-assist-bot';
    private sequelize: Sequelize;
    /**
     *
     */
    constructor(
        @inject(TYPES.Logger) private logger: winston.Logger,
    ) {
        this.sequelize = new Sequelize(<Options>{
            dialect: 'mssql',
            database: this.databaseName,
            host: 'itx-gamer\\SQLEXPRESS',
            port: 1433,
            username: this.username,
            password: this.password,
            dialectOptions: {
                options: {
                    enableArithAbort: true,
                    cryptoCredentialsDetails: {
                        minVersion: 'TLSv1',
                    },
                },
            },
            define: {
                freezeTableName: true,
                timestamps: false,
            },
        });
    }

    async connect() {
        try {
            await this.sequelize.authenticate();
            this.logger.info('Connection has been established successfully.');
        } catch (error) {
            this.logger.error('**Unable to connect to the database**:', error);
        }
    }
}
