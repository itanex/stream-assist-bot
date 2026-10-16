'use strict';

/**
 * Drops the raiders table (#165). RaidEvent is the single source of raid
 * records; raiders duplicated its incoming raids.
 *
 * down recreates the empty table as defined in 20261013120000-baseline;
 * dropped rows are not restored.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "raiders"`);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`CREATE TABLE IF NOT EXISTS "raiders" (
            "id" SERIAL PRIMARY KEY,
            "raider" VARCHAR(40) NOT NULL,
            "time" TIMESTAMP WITH TIME ZONE NOT NULL,
            "viewerCount" INTEGER NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "deletedAt" TIMESTAMP WITH TIME ZONE NULL
        )`);
    },
};
