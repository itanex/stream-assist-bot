'use strict';

/**
 * Throwaway: fails on purpose to confirm the Migrations workflow fails when a
 * migration does not apply (#177). Never merge.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`ALTER TABLE "table_that_does_not_exist" ADD COLUMN "probe" INTEGER`);
    },

    async down() {},
};
