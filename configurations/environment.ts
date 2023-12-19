import dotenv from 'dotenv';

dotenv.config();

const environment = {
    username: process.env.USERNAME,
    channel: process.env.CHANNEL,
    broadcasterId: process.env.BROADCASTER_ID,
    clientId: process.env.APP_CLIENT_ID,
    clientSecret: process.env.APP_CLIENT_SECRET,
    postgresDB: {
        database: process.env.POSTGRES_DB,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
    },
    twitchBot: {
        username: process.env.TWITCH_BOT_USERNAME,
        oauthToken: process.env.TWITCH_OAUTH_TOKEN,
    },
    waypoint: {
        dev: {
            primary: process.env.WAYPOINT_DEV_KEY_1,
            secondary: process.env.WAYPOINT_DEV_KEY_2,
        },
    },
    obs: {
        address: process.env.OBS_ADDRESS,
        secret: process.env.OBS_SECRET,
    },
    discordInvite: process.env.DISCORD_INVITE,
    twitter: {
        handle: process.env.TWITTER_HANDLE,
        link: process.env.TWITTER_LINK,
    },
};

export default environment;
