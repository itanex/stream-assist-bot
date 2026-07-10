import dotenv from 'dotenv';
import { IDatabaseConfiguration } from '../database/database';

dotenv.config();

const environment = {
    /** Setting for postgres database */
    databaseConfig: {
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
    } as IDatabaseConfiguration,
    twitchBot: {
        /** broadcaster information */
        broadcaster: {
            /** User Name - SplitPersonality */
            username: process.env.TWITCH_USERNAME,
            /** Twitch user id / broadcasterId */
            id: process.env.TWITCH_BROADCASTER_ID,
        },
        /** twitch bot information/identity */
        bot: {
            /** Bot Account Username */
            username: process.env.TWITCH_BOT_USERNAME,
            /** Bot Account twitch UserId */
            userId: process.env.TWITCH_BOT_USER_ID,
        },
        /** OBS Overlay Web server */
        overlay: {
            host: String(process.env.TWITCH_OVERLAY_HOST),
            port: Number(process.env.TWITCH_OVERLAY_PORT),
        },
        /** Web Socket server */
        websocket: {
            host: String(process.env.TWITCH_WEBSOCKET_HOST),
            port: Number(process.env.TWITCH_WEBSOCKET_PORT),
        },
        /** Authentication Web server */
        auth: {
            host: process.env.TWITCH_AUTH_HOST || '0.0.0.0',
            port: Number(process.env.TWITCH_AUTH_PORT) || 8090,
        },
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
