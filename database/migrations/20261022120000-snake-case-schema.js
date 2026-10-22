'use strict';

/**
 * Renames every table, column, and dependent object to lowercase snake_case,
 * singular (#164). Models map to these names through `underscored: true`.
 *
 * down restores the names built by 20261013120000-baseline.
 */

/** Columns sequelize adds to every paranoid model */
const TIMESTAMPS = ['createdAt', 'updatedAt', 'deletedAt'];

const BROADCASTER = ['broadcasterId', 'broadcasterName', 'broadcasterDisplayName'];
const USER = ['userId', 'userName', 'userDisplayName'];

/** Per table: baseline name, new name, camelCase columns besides TIMESTAMPS */
const TABLES = [
    {
        from: 'BanEvent',
        to: 'ban_event',
        columns: [
            'startDate', 'endDate', 'isPermanent',
            'moderatorId', 'moderatorName', 'moderatorDisplayName',
            ...BROADCASTER, ...USER,
        ],
    },
    {
        from: 'ChannelPointRedeem',
        to: 'channel_point_redeem',
        columns: [
            'eventId', ...BROADCASTER, ...USER,
            'rewardId', 'rewardTitle', 'rewardCost', 'rewardPrompt', 'redemptionDate',
        ],
    },
    {
        from: 'CheerEvent',
        to: 'cheer_event',
        columns: ['isAnonymous', ...BROADCASTER, ...USER],
    },
    {
        from: 'CommandResponse',
        to: 'command_response',
        columns: ['commandName', 'deletionId'],
    },
    {
        from: 'CommandResponseText',
        to: 'command_response_text',
        columns: ['commandResponseId', 'deletionId'],
    },
    {
        from: 'DeathCounts',
        to: 'death_count',
        columns: ['deathCount', 'gameId', 'streamId'],
    },
    {
        from: 'FollowEvent',
        to: 'follow_event',
        columns: ['followDate', ...BROADCASTER, ...USER],
    },
    {
        from: 'greetedUsers',
        to: 'greeted_user',
        columns: ['displayName', 'userId', 'streamId', 'greetedAt'],
    },
    {
        from: 'lurkingUsers',
        to: 'lurking_user',
        columns: ['displayName', 'userId', 'startTime', 'endTime'],
    },
    {
        from: 'ModeratorEvent',
        to: 'moderator_event',
        columns: ['addDate', 'removeDate', ...BROADCASTER, ...USER],
    },
    {
        from: 'RaidEvent',
        to: 'raid_event',
        columns: [
            'raidDate',
            'raidingBroadcasterId', 'raidingBroadcasterName', 'raidingBroadcasterDisplayName',
            'raidedBroadcasterId', 'raidedBroadcasterName', 'raidedBroadcasterDisplayName',
        ],
    },
    {
        from: 'StreamEventRecord',
        to: 'stream_event_record',
        columns: ['streamId', 'startDate', 'endDate', ...BROADCASTER],
    },
    {
        from: 'subscriptionGiftUsers',
        to: 'subscription_gift_user',
        columns: ['giftCount'],
    },
    {
        from: 'subscribers',
        to: 'subscriber',
        columns: ['isPrime', 'planName', 'giftUserId'],
    },
];

/** Named constraints: table (new name), baseline name, new name */
const CONSTRAINTS = [
    ['command_response', 'commandName-variant', 'command_response_command_name_variant_key'],
    ['command_response_text', 'CommandResponseText_commandResponseId_fkey', 'command_response_text_command_response_id_fkey'],
    ['subscriber', 'subscribers_giftUserId_fkey', 'subscriber_gift_user_id_fkey'],
];

/** Named indexes: baseline name, new name */
const INDEXES = [
    ['commandResponseId-text', 'command_response_text_command_response_id_text_idx'],
];

const toSnake = name => name.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);

function upStatements() {
    const sql = [];

    for (const { from, to, columns } of TABLES) {
        for (const column of [...columns, ...TIMESTAMPS]) {
            sql.push(`ALTER TABLE "${from}" RENAME COLUMN "${column}" TO "${toSnake(column)}"`);
        }

        sql.push(`ALTER TABLE "${from}" RENAME TO "${to}"`);
        sql.push(`ALTER INDEX "${from}_pkey" RENAME TO "${to}_pkey"`);
        sql.push(`ALTER SEQUENCE "${from}_id_seq" RENAME TO "${to}_id_seq"`);
    }

    for (const [table, from, to] of CONSTRAINTS) {
        sql.push(`ALTER TABLE "${table}" RENAME CONSTRAINT "${from}" TO "${to}"`);
    }

    for (const [from, to] of INDEXES) {
        sql.push(`ALTER INDEX "${from}" RENAME TO "${to}"`);
    }

    return sql;
}

function downStatements() {
    const sql = [];

    for (const [from, to] of INDEXES) {
        sql.push(`ALTER INDEX "${to}" RENAME TO "${from}"`);
    }

    for (const [table, from, to] of CONSTRAINTS) {
        sql.push(`ALTER TABLE "${table}" RENAME CONSTRAINT "${to}" TO "${from}"`);
    }

    for (const { from, to, columns } of [...TABLES].reverse()) {
        sql.push(`ALTER SEQUENCE "${to}_id_seq" RENAME TO "${from}_id_seq"`);
        sql.push(`ALTER INDEX "${to}_pkey" RENAME TO "${from}_pkey"`);
        sql.push(`ALTER TABLE "${to}" RENAME TO "${from}"`);

        for (const column of [...columns, ...TIMESTAMPS]) {
            sql.push(`ALTER TABLE "${from}" RENAME COLUMN "${toSnake(column)}" TO "${column}"`);
        }
    }

    return sql;
}

async function run(queryInterface, statements) {
    const { sequelize } = queryInterface;

    await sequelize.transaction(async transaction => {
        for (const sql of statements) {
            await sequelize.query(sql, { transaction });
        }
    });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await run(queryInterface, upStatements());
    },

    async down(queryInterface) {
        await run(queryInterface, downStatements());
    },
};
