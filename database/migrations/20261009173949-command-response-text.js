'use strict';

/**
 * Moves CommandResponse text into CommandResponseText (#121) and inserts the
 * command/variant pairs missing from an already-seeded database.
 *
 * No-op on a fresh database: sync() and seed() build and fill the new schema.
 * One-way: down throws.
 */

/**
 * Frozen snapshot of `defaultResponses` (bot/utilities/default-responses.ts)
 * at the time of this migration. Do not update it to track later changes.
 */
const SEED = {
    about: { '': [`I'm middleware between you and boredom - assembled from leftover npm packages and one caffeinated decision at 2am. I have strong opinions, weaker error handling, and a Postgres database that remembers absolutely everything.`] },
    dividebyzero: { '': [`Sorry I am too smart for your silly games!`] },
    drink: { '': [`Cheering 500 bits and Timy will do a shot. Max 8 per stream.`] },
    brain: { '': [`%targetuser%'s brain is %percent%% working.`] },
    cuddle: { '': [`%speakinguser% cuddles %targetuser%`] },
    lurk: { '': [`OK, %speakinguser% see you when you get back`] },
    unlurk: { '': [`Welcome back, %speakinguser%. You were gone for %lurkduration%`] },
    whoislurking: {
        none: [`There are no users currenlty lurking in the channel`],
        one: [`There is %total% user lurking: %lastuser%`],
        two: [`There are %total% users lurking: %users% and %lastuser%`],
        few: [`There are %total% users lurking: %users%, and %lastuser%`],
        many: [`There are %total% users lurking.`],
    },
    accountage: { '': [`@%targetuser% was created %accountage%`] },
    followage: { '': [`@%targetuser% has been following %broadcaster% for %followage%`] },
    lastdeathcount: { '': [`During the stream on %streamdate%, we used %deathtotal% timys in the following game(s): %streamcategory%`] },
    countExhaust: {
        '': [
            `I am about to run out of toes to count on %broadcaster%`,
            `I think I need to go back to school to learn more math to count that high`,
        ],
    },
    fall: {
        '': [
            `Timy go down the hooooole!`,
            `UH. Did Timy just fall down again?`,
            `What? Is Timy down the again?! Better get @slopez!`,
            `Hurry, I think Timy fell off the track again.`,
            `Timy doesn't fall down. He just explores the new frontiers of the latest and greatest games.`,
            `Timy didn't fall, he just doesn't understand level boundaries.`,
            `Timy didn't fall, he's trying new ways to play.`,
        ],
    },
    help: {
        '': [
            `I am stuck in this corner and unable to assist you at this time?`,
            `I could really use some help right now. Do you know where I can find a butter knife?`,
            `HELP!`,
            `I am afraid I can't do that`,
            `Are you... my friend?`,
        ],
    },
    eightball: {
        '': [
            `It is certain.`,
            `It is decidedly so.`,
            `Without a doubt.`,
            `Yes definitely.`,
            `You may rely on it.`,
            `As I see it, yes.`,
            `Most likely.`,
            `Outlook good.`,
            `Yes.`,
            `Signs point to yes.`,
            `Reply hazy, try again.`,
            `Ask again later.`,
            `Better not tell you now.`,
            `Cannot predict now.`,
            `Concentrate and ask again.`,
            `Don't count on it.`,
            `My reply is no.`,
            `My sources say no.`,
            `Outlook not so good.`,
            `Very doubtful.`,
        ],
    },
    wishlist: {
        '': [
            `Checkout my Throne wishlist https://jointhrone.com/u/timythetermite`,
            `Want to buy me a gift? https://jointhrone.com/u/timythetermite`,
            `Support the channel, checkout my wishlist on Throne https://jointhrone.com/u/timythetermite`,
        ],
    },
    hug: {
        '': [`%speakinguser% hugs %targetuser%`],
        self: [`%speakinguser% hugs themself`],
        notfound: [`%speakinguser% can't find %targetuser% and decides to hug everyone`],
    },
    throw: {
        '': [`%speakinguser% throws %item% at %targetuser%`],
        room: [`%speakinguser% throws %item% across the room`],
    },
    dice: { '': [`You rolled a %dice% that resulted in [ %rolls% ] in total %total%`] },
    uptime: {
        '': [`%broadcaster% has been online for %duration%`],
        offline: [`%broadcaster% has been offline for %duration%`],
    },
    death: {
        first: [`We're gonna need another Timy!`],
        '': [
            `Timy is finding the quickest way to spawn new Timys`,
            `Timy tried taking on gravity and lost`,
            `Gonna need an abacus for this many deaths`,
        ],
    },
    deathcount: {
        '': [`We have used %deathtotal% Timys today`],
        single: [`We have used %deathtotal% Timy today`],
    },
    lastraid: {
        '': [`%raider%, raided the colony %when% with %viewercount% viewers!!!`],
        single: [`%raider%, raided the colony %when%!!!`],
    },
    lastsub: {
        newsub: [`%subscriber%, subscribed as a new member of the colony %when%`],
        primesub: [`%subscriber%, subscribed using their Prime Sub %when%`],
        resub: [`%subscriber% continued their colony membership %when%`],
        giftsub: [`%gifter% gifted, %subscriber%, recruiting them into the colony %when%`],
        communitysub: [`%gifter% gifted %giftcount% memberships into the colony %when%`],
    },
    shoutout: {
        wasstreaming: [`@%targetuser% was streaming '%streamcategory%' %when% - %link%`],
        wasstreamingnotopic: [`@%targetuser% was streaming %when% - %link%`],
        wasstreamingtoday: [`Today, @%targetuser% was streaming '%streamcategory%' %when% - %link%`],
        wasstreamingtodaynotopic: [`Today, @%targetuser% was streaming %when% - %link%`],
        planstostream: [`@%targetuser% plans to stream '%streamcategory%' %when% - %link%`],
        planstostreamnotopic: [`@%targetuser% plans to stream %when% - %link%`],
        planstostreamtoday: [`Today, @%targetuser% plans to stream '%streamcategory%' %when% - %link%`],
        planstostreamtodaynotopic: [`Today, @%targetuser% plans to stream %when% - %link%`],
        lastrecent: [`@%targetuser% was last streaming '%streamcategory%' %when% - %link%`],
        last: [`@%targetuser% was last streaming '%streamcategory%' - %link%`],
        checkout: [`Check out @%targetuser% at %link%`],
        justfinished: [`@%targetuser% just finished streaming '%streamcategory%' - %link%`],
    },
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const { sequelize } = queryInterface;
        const { QueryTypes } = Sequelize;

        await sequelize.transaction(async transaction => {
            const select = (sql, bind = []) => sequelize
                .query(sql, { bind, transaction, type: QueryTypes.SELECT });
            const run = (sql, bind = []) => sequelize
                .query(sql, { bind, transaction });

            // 1. Fresh database: sync() creates the new schema and seed() fills it
            const [{ exists }] = await select(`SELECT to_regclass('public."CommandResponse"') IS NOT NULL AS "exists"`);

            if (!exists) {
                return;
            }

            // 2. Removal batch id on CommandResponse
            await run(`ALTER TABLE "CommandResponse" ADD COLUMN IF NOT EXISTS "deletionId" UUID NULL`);

            // 3. CommandResponseText, matching database/models/command-response-text.dbo.ts
            await run(`
                CREATE TABLE IF NOT EXISTS "CommandResponseText" (
                    "id" SERIAL PRIMARY KEY,
                    "commandResponseId" INTEGER NOT NULL
                        REFERENCES "CommandResponse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    "text" TEXT NOT NULL,
                    "weight" DECIMAL NOT NULL DEFAULT 1,
                    "deletionId" UUID NULL,
                    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                    "deletedAt" TIMESTAMP WITH TIME ZONE NULL
                )`);
            await run(`
                CREATE UNIQUE INDEX IF NOT EXISTS "commandResponseId-text"
                ON "CommandResponseText" ("commandResponseId", lower("text"))`);

            // 4-5. Move CommandResponse.text into CommandResponseText, then drop it
            const [{ hasText }] = await select(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'CommandResponse'
                      AND column_name = 'text'
                ) AS "hasText"`);

            if (hasText) {
                // restore requires a deletionId; one batch per previously removed row
                await run(`
                    UPDATE "CommandResponse"
                    SET "deletionId" = gen_random_uuid()
                    WHERE "deletedAt" IS NOT NULL
                      AND "deletionId" IS NULL`);

                await run(`
                    INSERT INTO "CommandResponseText"
                        ("commandResponseId", "text", "weight", "deletionId", "createdAt", "updatedAt", "deletedAt")
                    SELECT "id", "text", 1, "deletionId", "createdAt", "updatedAt", "deletedAt"
                    FROM "CommandResponse"
                    ON CONFLICT ("commandResponseId", lower("text")) DO NOTHING`);

                await run(`ALTER TABLE "CommandResponse" DROP COLUMN "text"`);
            }

            // 6. Insert snapshot pairs absent from CommandResponse, counting removed rows
            const pairs = Object
                .entries(SEED)
                .flatMap(([commandName, variants]) => Object
                    .entries(variants)
                    .map(([variant, texts]) => ({ commandName, variant, texts })));

            for (const { commandName, variant, texts } of pairs) {
                const existing = await select(
                    `SELECT 1 FROM "CommandResponse" WHERE "commandName" = $1 AND "variant" = $2`,
                    [commandName, variant],
                );

                if (existing.length > 0) {
                    continue;
                }

                const [{ id }] = await select(
                    `INSERT INTO "CommandResponse" ("commandName", "variant", "createdAt", "updatedAt")
                     VALUES ($1, $2, NOW(), NOW())
                     RETURNING "id"`,
                    [commandName, variant],
                );

                for (const text of texts) {
                    await run(
                        `INSERT INTO "CommandResponseText" ("commandResponseId", "text", "weight", "createdAt", "updatedAt")
                         VALUES ($1, $2, 1, NOW(), NOW())`,
                        [id, text],
                    );
                }
            }
        });
    },

    async down() {
        throw new Error('20261009173949-command-response-text is irreversible; restore from backup');
    },
};
