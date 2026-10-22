import { inject, injectable } from 'inversify';
import { QueryTypes } from 'sequelize';
import { HelixStream } from '@twurple/api';
import winston from 'winston';
import InjectionTypes from '../../dependency-management/types.js';
import { DeathCountDbo } from '../../database/index.js';

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
    async recordNewDeath(stream: HelixStream): Promise<DeathCountDbo | null> {
        try {
            const [instance, created] = await DeathCountDbo
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
    async getCurrentStreamDeathCount(stream: HelixStream): Promise<DeathCountDbo | null> {
        return DeathCountDbo
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
    async getLastStreamDeathCount(streamId: string): Promise<DeathCountDbo[]> {
        const lastStreamDeaths: string = `
            SELECT *
            FROM public.death_count
            WHERE stream_id in (
                SELECT DISTINCT stream_id
                FROM public.death_count
                WHERE created_at = (
                    SELECT max(created_at)
                    FROM public.death_count
                    WHERE stream_id <> $streamId
                )
            )
            order by created_at Asc
        `;

        return DeathCountDbo
            .sequelize!
            .query<DeathCountDbo>(lastStreamDeaths, {
                type: QueryTypes.SELECT,
                model: DeathCountDbo,
                mapToModel: true,
                raw: true,
                bind: {
                    streamId,
                },
            });
    }
}
