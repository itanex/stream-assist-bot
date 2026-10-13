'use strict';

/**
 * Baseline schema (#161): every table defined by database/models, built from
 * an empty database. Absorbs all earlier migrations.
 *
 * Create-if-not-exists only; never alters an existing object.
 * Baseline: nothing to roll back to, down throws.
 */

/** Columns sequelize adds to every paranoid model */
const TIMESTAMPS = `
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE NULL`;

/** Ordered so referenced tables are created first */
const TABLES = [
    // database/models/ban-event.dbo.ts
    `CREATE TABLE IF NOT EXISTS "BanEvent" (
        "id" SERIAL PRIMARY KEY,
        "reason" VARCHAR(255),
        "startDate" TIMESTAMP WITH TIME ZONE,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "isPermanent" BOOLEAN,
        "moderatorId" VARCHAR(20),
        "moderatorName" VARCHAR(40),
        "moderatorDisplayName" VARCHAR(40),
        "broadcasterId" VARCHAR(20),
        "broadcasterName" VARCHAR(40),
        "broadcasterDisplayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "userName" VARCHAR(40),
        "userDisplayName" VARCHAR(40),
        ${TIMESTAMPS}
    )`,

    // database/models/channel-point-redeem.dbo.ts
    `CREATE TABLE IF NOT EXISTS "ChannelPointRedeem" (
        "id" SERIAL PRIMARY KEY,
        "eventId" UUID NOT NULL,
        "broadcasterId" VARCHAR(20),
        "broadcasterName" VARCHAR(40),
        "broadcasterDisplayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "userName" VARCHAR(40),
        "userDisplayName" VARCHAR(40),
        "input" VARCHAR(255),
        "status" VARCHAR(20),
        "rewardId" UUID,
        "rewardTitle" VARCHAR(255),
        "rewardCost" INTEGER,
        "rewardPrompt" VARCHAR(255),
        "redemptionDate" TIMESTAMP WITH TIME ZONE,
        ${TIMESTAMPS}
    )`,

    // database/models/cheer-event.dbo.ts
    `CREATE TABLE IF NOT EXISTS "CheerEvent" (
        "id" SERIAL PRIMARY KEY,
        "bits" INTEGER,
        "isAnonymous" BOOLEAN,
        "message" VARCHAR(255),
        "broadcasterId" VARCHAR(20),
        "broadcasterName" VARCHAR(40),
        "broadcasterDisplayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "userName" VARCHAR(40),
        "userDisplayName" VARCHAR(40),
        ${TIMESTAMPS}
    )`,

    // database/models/command-response.dbo.ts
    `CREATE TABLE IF NOT EXISTS "CommandResponse" (
        "id" SERIAL PRIMARY KEY,
        "commandName" VARCHAR(32) NOT NULL,
        "variant" VARCHAR(32) NOT NULL DEFAULT '',
        "deletionId" UUID NULL,
        ${TIMESTAMPS},
        CONSTRAINT "commandName-variant" UNIQUE ("commandName", "variant")
    )`,

    // database/models/command-response-text.dbo.ts
    `CREATE TABLE IF NOT EXISTS "CommandResponseText" (
        "id" SERIAL PRIMARY KEY,
        "commandResponseId" INTEGER NOT NULL
            REFERENCES "CommandResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "text" TEXT NOT NULL,
        "weight" DECIMAL NOT NULL DEFAULT 1,
        "deletionId" UUID NULL,
        ${TIMESTAMPS}
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "commandResponseId-text"
        ON "CommandResponseText" ("commandResponseId", lower("text"))`,

    // database/models/death-count-record.dbo.ts
    `CREATE TABLE IF NOT EXISTS "DeathCounts" (
        "id" SERIAL PRIMARY KEY,
        "deathCount" INTEGER,
        "game" VARCHAR(80),
        "gameId" VARCHAR(80),
        "streamId" VARCHAR(80),
        ${TIMESTAMPS}
    )`,

    // database/models/follow-event.dbo.ts
    `CREATE TABLE IF NOT EXISTS "FollowEvent" (
        "id" SERIAL PRIMARY KEY,
        "followDate" TIMESTAMP WITH TIME ZONE,
        "broadcasterId" VARCHAR(20),
        "broadcasterName" VARCHAR(40),
        "broadcasterDisplayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "userName" VARCHAR(40),
        "userDisplayName" VARCHAR(40),
        ${TIMESTAMPS}
    )`,

    // database/models/greet-user.dbo.ts
    `CREATE TABLE IF NOT EXISTS "greetedUsers" (
        "id" SERIAL PRIMARY KEY,
        "displayName" VARCHAR(40) NOT NULL,
        "userId" VARCHAR(20) NOT NULL,
        "streamId" VARCHAR(80) NOT NULL,
        "greetedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        ${TIMESTAMPS}
    )`,

    // database/models/lurking-user.dbo.ts
    `CREATE TABLE IF NOT EXISTS "lurkingUsers" (
        "id" SERIAL PRIMARY KEY,
        "displayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "startTime" TIMESTAMP WITH TIME ZONE,
        "endTime" TIMESTAMP WITH TIME ZONE NULL,
        ${TIMESTAMPS}
    )`,

    // database/models/moderator-event.dbo.ts
    `CREATE TABLE IF NOT EXISTS "ModeratorEvent" (
        "id" SERIAL PRIMARY KEY,
        "addDate" TIMESTAMP WITH TIME ZONE,
        "removeDate" TIMESTAMP WITH TIME ZONE NULL,
        "broadcasterId" VARCHAR(20),
        "broadcasterName" VARCHAR(40),
        "broadcasterDisplayName" VARCHAR(40),
        "userId" VARCHAR(20),
        "userName" VARCHAR(40),
        "userDisplayName" VARCHAR(40),
        ${TIMESTAMPS}
    )`,

    // database/models/raid-event.dbo.ts
    `CREATE TABLE IF NOT EXISTS "RaidEvent" (
        "id" SERIAL PRIMARY KEY,
        "raidDate" TIMESTAMP WITH TIME ZONE,
        "viewers" INTEGER,
        "raidingBroadcasterId" VARCHAR(40),
        "raidingBroadcasterName" VARCHAR(40),
        "raidingBroadcasterDisplayName" VARCHAR(40),
        "raidedBroadcasterId" VARCHAR(40),
        "raidedBroadcasterName" VARCHAR(40),
        "raidedBroadcasterDisplayName" VARCHAR(40),
        ${TIMESTAMPS}
    )`,

    // database/models/raiders.dbo.ts
    `CREATE TABLE IF NOT EXISTS "raiders" (
        "id" SERIAL PRIMARY KEY,
        "raider" VARCHAR(40) NOT NULL,
        "time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "viewerCount" INTEGER NOT NULL,
        ${TIMESTAMPS}
    )`,

    // database/models/stream-event-record.dbo.ts
    `CREATE TABLE IF NOT EXISTS "StreamEventRecord" (
        "id" SERIAL PRIMARY KEY,
        "streamId" VARCHAR(40) NOT NULL,
        "type" VARCHAR(20) NOT NULL,
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endDate" TIMESTAMP WITH TIME ZONE NULL,
        "broadcasterId" VARCHAR(20) NOT NULL,
        "broadcasterName" VARCHAR(40) NOT NULL,
        "broadcasterDisplayName" VARCHAR(40) NOT NULL,
        ${TIMESTAMPS}
    )`,

    // database/models/subscription-gift-users.dbo.ts
    `CREATE TABLE IF NOT EXISTS "subscriptionGiftUsers" (
        "id" SERIAL PRIMARY KEY,
        "gifter" VARCHAR(40),
        "giftCount" INTEGER,
        ${TIMESTAMPS}
    )`,

    // database/models/subscribers.dbo.ts
    `CREATE TABLE IF NOT EXISTS "subscribers" (
        "id" SERIAL PRIMARY KEY,
        "subscriber" VARCHAR(40),
        "type" VARCHAR(20),
        "streak" INTEGER,
        "months" INTEGER,
        "isPrime" BOOLEAN,
        "plan" VARCHAR(40),
        "planName" VARCHAR(40),
        "time" TIMESTAMP WITH TIME ZONE,
        "giftUserId" INTEGER NULL
            REFERENCES "subscriptionGiftUsers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        ${TIMESTAMPS}
    )`,
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;

        await sequelize.transaction(async transaction => {
            for (const sql of TABLES) {
                await sequelize.query(sql, { transaction });
            }
        });
    },

    async down() {
        throw new Error('20261013120000-baseline is the baseline; nothing to roll back to');
    },
};
