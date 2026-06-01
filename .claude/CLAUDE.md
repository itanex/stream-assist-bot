# Stream Assist Bot

A TypeScript Twitch chat bot with EventSub integration, PostgreSQL persistence, OBS overlay support, and an Inversify dependency injection architecture.

## Tech Stack

- **Runtime**: Node.js + TypeScript (ts-node, no build step)
- **Twitch**: @twurple/chat, @twurple/api, @twurple/auth, @twurple/eventsub-ws, @twurple/eventsub-http (v7.0.10)
- **DI**: Inversify 6 with reflect-metadata
- **ORM**: Sequelize 6 + sequelize-typescript + PostgreSQL (pg)
- **Logging**: Winston + daily-rotate-file
- **Testing**: Jest + ts-jest
- **Linting**: ESLint + airbnb-base

## Common Commands

```bash
npm start              # Run app (production)
npm run dev            # Run app (development)
npm test               # Jest (no cache, detect open handles)
npm run test-coverage  # Jest with coverage report
npm run test-dev       # Jest watch mode with coverage
docker compose up      # Start app + PostgreSQL
```

## Project Structure

```
app.ts                          # Entry point — bootstraps all services
configurations/
  environment.ts                # Centralized env var loader (from .env)
  required-scopes.ts            # Twitch OAuth scopes
dependency-management/
  inversify.config.ts           # DI container bindings
  types.ts                      # InjectionTypes symbols
database/
  database.ts                   # Sequelize connection + model sync
  models/                       # ORM models (Subscribers, BanEvent, etc.)
  migrations/                   # Sequelize CLI migrations
bot/
  chat-bot.ts                   # ChatBot orchestrator — wires all listeners
  scheduler.ts                  # Cron jobs (e.g. broadcast !socials every 30min)
  commands/                     # ICommandHandler implementations (25+ commands)
  handlers/
    message.handler.ts          # Central command dispatcher & permission gate
  event-sub-handlers/           # Twitch EventSub event handlers
  overlay/
    socket.server.ts            # WebSocket broadcast server (port 8081)
    overlay.server.ts           # HTTP server for OBS browser sources (port 8070)
  auth/
    auth.server.ts              # Twitch OAuth callback handler
  utilities/                    # Shared helpers (Broadcaster, etc.)
  types/                        # Shared type definitions
logger/
  logger.ts                     # Winston logger config
```

## Architecture

### Dependency Injection (Inversify)

All services use constructor injection. Bindings are in [dependency-management/inversify.config.ts](dependency-management/inversify.config.ts):
- **Singletons**: `Database`, `ChatBot`, `Scheduler`, socket/overlay/auth servers
- **Multi-binding**: All command handlers bound to `InjectionTypes.CommandHandlers`
- **Constants**: `ChatClient`, `ApiClient`, `EventSubWsListener`, `Logger`

### Adding a New Command

1. Create a class in `bot/commands/` implementing `ICommandHandler`
2. Define: `pattern` (regex), `timeout`, permission flags (`isMod`, `isVIP`, `isSubscriber`, `isFollower`), `isOnline` restriction
3. Bind it in `inversify.config.ts` as a multi-binding under `InjectionTypes.CommandHandlers`
4. The `MessageHandler` will discover and route to it automatically

### Adding an EventSub Handler

1. Create a class in `bot/event-sub-handlers/` implementing the relevant handler interface
2. Register the subscription in `bot/chat-bot.ts` via the `EventSubWsListener`

### Permission Hierarchy

`broadcaster > mod > VIP > subscriber > follower > viewer`

The `MessageHandler` enforces this before routing to any command.

## External Integrations

| Service | Purpose | Config Key |
|---------|---------|-----------|
| Twitch API | Chat, EventSub, user queries | `TWITCH_APP_CLIENT_ID/SECRET` |
| PostgreSQL | Persistent data storage | `POSTGRES_*` |
| OBS WebSocket | Overlay control | `OBS_ADDRESS`, `OBS_SECRET` |
| Google TTS | Text-to-speech | (google-tts-api, no key needed) |
| Waypoint API | Custom integration | `WAYPOINT_DEV_KEY_1/2` |
| Weather API | Weather data | `WEATHER_API_KEY` |

## Environment Setup

1. Copy `.env` and fill in real credentials
2. Create auth token file: `./local-cache/auth-tokens.{TWITCH_BROADCASTER_ID}.json`
   - Must contain a valid Twitch `RefreshingAuthProvider` AccessToken JSON
3. PostgreSQL must be running (local port 6432, or via `docker compose up`)

## Key .env Variables

```
TWITCH_USERNAME / TWITCH_BROADCASTER_ID / TWITCH_CHANNEL
TWITCH_BOT_USERNAME / TWITCH_BOT_USER_ID
TWITCH_APP_OAUTH_TOKEN / TWITCH_APP_CLIENT_ID / TWITCH_APP_CLIENT_SECRET
TWITCH_OVERLAY_HOST=0.0.0.0 / TWITCH_OVERLAY_PORT=8070
TWITCH_WEBSOCKET_HOST=0.0.0.0 / TWITCH_WEBSOCKET_PORT=8080
POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_HOST / POSTGRES_PORT
OBS_ADDRESS / OBS_SECRET
DISCORD_INVITE / TWITTER_HANDLE / TWITTER_LINK / YOUTUBE_LINK
WEATHER_API_KEY / WAYPOINT_DEV_KEY_1 / WAYPOINT_DEV_KEY_2
```

## Testing Conventions

- Test files live alongside source or in a `__tests__/` folder
- Use `ts-jest` for TypeScript support — no separate compile step
- Integration tests should use a real database, not mocks (mocked tests have caused prod divergence issues before)
- Run `npm test` before committing to catch open handles