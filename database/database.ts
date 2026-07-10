import { inject, injectable } from 'inversify';
import winston from 'winston';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { DialectName } from '@sequelize/core';
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
import sqlLogger from '../logger/sql-logger';

/**
 * which sequelize dialect to use
 */
const dbDialect: DialectName = 'postgres';

export interface IDatabaseConfiguration {
    database: string;
    username: string;
    password: string;
    host: string;
    port: number;
}

/**
 * Connection information for Postgres,
 * sequelize syntax
 */
function buildPostgresqlConfig(config: IDatabaseConfiguration): SequelizeOptions {
    return {
        database: config.database,
        username: config.username,
        password: config.password,
        host: config.host,
        port: config.port,
        dialect: dbDialect,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        logging: (sql: string) => sqlLogger.debug(sql),
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
    } as SequelizeOptions;
}

@injectable()
export default class Database {
    private sequelize: Sequelize;

    get db(): Sequelize {
        return this.sequelize;
    }

    constructor(
        @inject(InjectionTypes.DatabaseConfiguration) private dbconfig: IDatabaseConfiguration,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {
        const config = buildPostgresqlConfig(dbconfig);
        this.sequelize = new Sequelize(config);
    }

    async connect(): Promise<void> {
        await this.validate()
            .then(() => this.logger.info('DB Connection has been established successfully.'))
            .catch((error: any) => this.logger.error('**Unable to connect to the database**:', error));
    }

    async sync(): Promise<void> {
        await this.sequelize
            // sync logging has no diagnostic value
            .sync({ logging: false })
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
