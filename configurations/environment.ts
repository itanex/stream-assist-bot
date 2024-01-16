import dotenv from 'dotenv';

dotenv.config();

const environment = {
    /** Setting for postgres database */
    postgresDB: {
        /** Database name to connect to */
        database: process.env.POSTGRES_DB,
        /** Database username */
        username: process.env.POSTGRES_USER,
        /** Database password */
        password: process.env.POSTGRES_PASSWORD,
        /** Host url for database */
        host: process.env.POSTGRES_HOST,
        /** Port number of database on host */
        port: Number(process.env.POSTGRES_PORT),
    },
    twitchBot: {
        /** broadcaster information */
        broadcaster: {
            /** User Name - SplitPersonality */
            username: process.env.TWITCH_USERNAME,
            /** Twitch user id / broadcasterId */
            id: process.env.TWITCH_BROADCASTER_ID,
        },
        /** User Name - TimyTheTermite */
        username: process.env.TWITCH_BOT_USERNAME,
        /** Channel(s) to join - TimyTheTermite */
        channel: process.env.TWITCH_CHANNEL,
        oauthToken: process.env.TWITCH_APP_OAUTH_TOKEN,
        clientId: process.env.TWITCH_APP_CLIENT_ID,
        clientSecret: process.env.TWITCH_APP_CLIENT_SECRET,
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
    weatherApi: {
        apiKey: process.env.WEATHER_API_KEY,
    },
    youtube: {
        link: process.env.YOUTUBE_LINK,
    },
};

export default environment;
