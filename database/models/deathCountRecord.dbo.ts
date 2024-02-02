import { HelixStream } from '@twurple/api';
import { QueryTypes } from 'sequelize';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'DeathCounts',
    paranoid: true,
})
export default class DeathCounts extends Model {
    @Column({
        type: DataType.INTEGER,
        field: 'deathCount',
    })
    deathCount: number;

    @Column({
        type: DataType.STRING(80),
        field: 'game',
    })
    game: string;

    @Column({
        type: DataType.STRING(80),
        field: 'gameId',
    })
    gameId: string;

    @Column({
        type: DataType.STRING(80),
        field: 'streamId',
    })
    streamId: string;

    /**
     * Finds (or Creates) the current stream's death record
     * @param stream The current stream
     * @returns The death count record for the stream, and if it was created
     */
    static async recordNewDeath(stream: HelixStream): Promise<[DeathCounts, boolean]> {
        return this
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
    }

    /**
     * Finds (or Creates) the current stream's death record
     * @param stream The current stream
     * @returns The death count record for the stream, and if it was created
     */
    static async getCurrentStreamDeathCount(stream: HelixStream): Promise<[DeathCounts, boolean]> {
        return this.findOrCreate({
            where: {
                streamId: stream.id,
                gameId: stream.gameId,
            },
            defaults: {
                deathCount: 0,
                gameId: stream.gameId,
                game: stream.gameName,
                streamId: stream.id,
            },
        });
    }

    /**
     * Gets all the death count records for the previous stream record in the database
     * @param streamId The id of the current stream
     * @returns Array of death count records for the previous stream
     */
    static async getLastStreamDeathCount(streamId: string): Promise<DeathCounts[]> {
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

        return this.sequelize.query<DeathCounts>(lastStreamDeaths, {
            type: QueryTypes.SELECT,
            bind: {
                streamId,
            },
        });
    }
}
