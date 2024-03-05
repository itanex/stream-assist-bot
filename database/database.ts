import { inject, injectable } from 'inversify';
import winston from 'winston';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { Dialect } from '@sequelize/core';
import InjectionTypes from '../dependency-management/types';
import {
    BanEvent,
    ChannelPointRedeem,
    CheerEvent,
    DeathCounts,
    FollowEvent,
    LurkingUsers,
    ModeratorEvent,
    Raiders,
    StreamEventRecord,
    SubscriptionGiftUsers,
    Subscribers,
    RaidEvent,
} from '.';
import environment from '../configurations/environment';

/**
 * which sequelize dialect to use
 */
const dbDialect: Dialect = 'postgres';

/**
 * Connection information for Postgres,
 * sequelize syntax
 */
const pgConfig: SequelizeOptions = {
    database: environment.postgresDB.database,
    username: environment.postgresDB.username,
    password: environment.postgresDB.password,
    host: environment.postgresDB.host,
    port: environment.postgresDB.port,
    dialect: dbDialect,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    logging: false,
    models: [
        BanEvent,
        ChannelPointRedeem,
        CheerEvent,
        DeathCounts,
        FollowEvent,
        LurkingUsers,
        ModeratorEvent,
        RaidEvent,
        Raiders,
        StreamEventRecord,
        SubscriptionGiftUsers,
        Subscribers,
    ],
};

@injectable()
export default class Database {
    private sequelize: Sequelize;

    get db(): Sequelize {
        return this.sequelize;
    }

    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
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
