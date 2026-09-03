import { inject, injectable } from 'inversify';
import { QueryTypes } from 'sequelize';
import { HelixStream } from '@twurple/api';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { DeathCounts } from '../../database/index.js';

@injectable()
export default class DeathCountRepository {
    constructor(
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) { }

    /**
     * Finds (or Creates) the current stream's death record
     * @param stream The current stream
     * @returns The death count record for the stream, and if it was created
     */
    async recordNewDeath(stream: HelixStream): Promise<DeathCounts | null> {
        try {
            const [instance, created] = await DeathCounts
                .findOrCreate({
                    where: {
                        streamId: stream.id,
                        gameId: stream.gameId,
                    },
                    defaults: {
                        deathCount: 1,
                        gameId: stream.gameId,
                        game: stream.gameName,
                        streamId: stream.id,
                    },
                });

            if (!created) {
                instance.deathCount++;
                await instance.save();
            }

            return instance;
        } catch (error: any) {
            this.logger.error(`Error creating Death Count record to database`, error);
        }

        return null;
    }

    /**
     * Finds the current stream's death record
     * @param stream The current stream
     * @returns The death count record for the stream, null when not found
     */
    async getCurrentStreamDeathCount(stream: HelixStream): Promise<DeathCounts | null> {
        return DeathCounts
            .findOne({
                where: {
                    streamId: stream.id,
                    gameId: stream.gameId,
                },
            });
    }

    /**
     * Gets all the death count records for the previous stream record in the database
     * @param streamId The id of the current stream
     * @returns Array of death count records for the previous stream
     */
    async getLastStreamDeathCount(streamId: string): Promise<DeathCounts[]> {
        const lastStreamDeaths: string = `
            SELECT *
            FROM public."DeathCounts"
            WHERE "streamId" in (
                SELECT DISTINCT "streamId"
                FROM public."DeathCounts"
                WHERE "createdAt" = (
                    SELECT max("createdAt")
                    FROM public."DeathCounts"
                    WHERE "streamId" <> $streamId
                )
            )
            order by "createdAt" Asc
        `;

        return DeathCounts
            .sequelize!
            .query<DeathCounts>(lastStreamDeaths, {
                type: QueryTypes.SELECT,
                bind: {
                    streamId,
                },
            });
    }
}
