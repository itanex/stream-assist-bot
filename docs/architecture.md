# Architecture

This is the single reference for how Stream Assist Bot is designed and the rules code in this repository follows. Contributor and AI-assistant instruction files (such as `.claude/CLAUDE.md`) summarize and defer to this file; when they disagree, this file wins.

Feature-level detail lives in topic docs:

* [Command System](command-system.md) - commands, permissions, cooldowns, database-backed responses, template rendering

---

## Runtime Overview

The bot is a single Node.js process (TypeScript, run via ts-node, no build step). `app.ts` is the entry point:

1. Resolves the `App` singleton from the Inversify container (`dependency-management/inversify.config.ts`)
2. Configures `ChatBot` (wires chat and EventSub listeners)
3. In parallel: initializes the `Database` (connect + model sync), starts the WebSocket server, configures the overlay and auth servers, and schedules chat events
4. Initializes `CommandResponseService` (seeds and caches response text - requires the database)
5. Starts listening on the auth and overlay servers
6. Starts `ChatBot` if a user token exists; otherwise waits for the OAuth flow, after which the auth server starts it

`SIGINT`, `SIGQUIT` and `SIGTERM` disconnect the database and shut the chat bot down.

---

## Directory Layout

| Path | Contents |
|---|---|
| `app.ts` | Entry point and process lifecycle |
| `configurations/` | Environment loading (`environment.ts`), OAuth scopes, database CLI config |
| `dependency-management/` | Inversify container bindings and `InjectionTypes` symbols |
| `database/` | `Database` (Sequelize connection), `models/` (Sequelize models) |
| `bot/chat-bot.ts` | Orchestrator - wires chat events and EventSub subscriptions to handlers |
| `bot/scheduler.ts` | Cron-scheduled chat events |
| `bot/commands/` | Chat commands (`ICommandHandler` implementations) |
| `bot/handlers/` | Chat event handlers - message dispatch, raids, subscriptions, join greetings |
| `bot/event-sub-handlers/` | Twitch EventSub event handlers |
| `bot/services/` | Application services - business rules and in-memory state over repositories |
| `bot/repositories/` | Data access - the only code that queries Sequelize models |
| `bot/utilities/` | Shared helpers (`Broadcaster`, `templateResolver`, `defaultResponses`, time spans) |
| `bot/overlay/`, `bot/auth/` | HTTP/WebSocket servers for OBS overlays and the OAuth callback |
| `logger/` | Winston logger configuration |
| `tests/` | Shared test mocks and Jest setup |

---

## Layers and Dependency Direction

```
Entry points   commands, chat handlers, event-sub handlers, servers, scheduler
      |
Services       bot/services
      |
Repositories   bot/repositories
      |
Models         database/models
```

Utilities (`bot/utilities`) and infrastructure (`Logger`, `ChatClient`, `ApiClient`, `Broadcaster`) may be used from any layer.

### Rules

* Dependencies point downward only. A lower layer never imports from a layer above it.
* Repositories are the only code that queries Sequelize models.
* Services own business rules and any in-memory caching over repository data (e.g. `CommandResponseService` caches response text; `GreetUserService` caches greeted users).
* **Commands access data through services, never repositories.** Response text is read only through `CommandResponseService`.

### Current exceptions

* Some commands still inject a repository directly because no service exists for it yet. The list is maintained in [Command System - Direct Repository Access](command-system.md#direct-repository-access-known-exception); removal is tracked in [#158](https://github.com/itanex/stream-assist-bot/issues/158). New commands must not add to it.
* Chat handlers and event-sub handlers currently inject repositories directly (`RaidRepository`, `SubscriberRepository`, `BanEventRepository`, `ChannelEventRepository`, `LurkRespository`, `StreamEventRepository`). No layering rule has been set for these entry points yet.

---

## Dependency Injection

* All classes use constructor injection (`@injectable()` + `@inject(...)`). Nothing constructs its own dependencies.
* Every binding lives in `dependency-management/inversify.config.ts`:
  * **Singletons** - `Database`, `Broadcaster`, all repositories, all services, `ChatBot`, `Scheduler`, and the socket/overlay/auth servers
  * **Multi-binding** - every command is bound to `InjectionTypes.CommandHandlers`; `MessageHandler` receives them all
  * **Constants** - `ChatClient`, `ApiClient`, `EventSubWsListener`, `Logger`, environment and database configuration
* New classes must be bound there before anything can inject them.
* Tests never build an Inversify container - see [Testing](#testing).

---

## Persistence

* PostgreSQL through Sequelize 6 + sequelize-typescript.
* `Database.initialize()` connects and runs `sequelize.sync()`, which creates the schema from `database/models` at startup.
* Command response text is seeded from `defaultResponses` into an empty `CommandResponse` table on startup; see [Command System - Database-Backed Responses](command-system.md#database-backed-responses).

---

## Logging

* Inject the Winston logger with `@inject(InjectionTypes.Logger)`. Do not use `console` (the startup banner in `app.ts` is the only exception).
* Log messages are for operators, not contracts: tests never assert on log message text (see [Testing](#testing)).
* When a command cannot find its response text it logs a warning carrying the variant (`{ variant }`) and says nothing in chat.

---

## Testing

Jest + ts-jest (ESM). `tests/jest.setup.ts` makes every test require at least one assertion.

### Unit tests first

* Tests are unit tests wherever that is plausible: construct the subject directly and pass mocked dependencies from `tests/common.mocks.ts` (e.g. `mockChatClient`, `mockCommandResponseService`, `mockLogger`).
* Never build an Inversify container in a test.
* Command specs serve response text by pointing `mockCommandResponseService.getCommandResponse` at a per-spec `commandName -> variant -> texts` object, and assert the exact resolved chat output.

### Database-backed tests

* Only code that genuinely needs a database - repositories and `Database` itself - is tested against PostgreSQL.
* Those specs start a disposable `@testcontainers/postgresql` container per spec, so tests can never touch a local or live database. Docker must be running.
* Clean up rows between tests (`Model.destroy({ where: {}, force: true })`).

### Log assertions

* Assert that a log call happened and what data it carried - never the message text: `expect.any(String)` for the message, plus the data argument (`{ variant }`, `expect.any(Error)`, ...) where one is logged. Use call counts where two logs must be told apart.

### Scaffolding

VS Code snippets in `.vscode/jest.test.code-snippets`:

* `bot-command-test` - command unit test
* `bot-repository-test` - repository test against a postgres testcontainer

---

## Code Style

* ESLint with `airbnb-base`; `.editorconfig` for whitespace.
* Named imports with three or more members from one module go on multiple lines, one per line with a trailing comma (general practice; a single line is acceptable where it reads better).
* Markdown lists use `*` bullets.

---

## Issues and Commits

* One pull request completes and closes one issue. Work needing more than one pull request is an epic: it belongs to a milestone and is split into pull-request-sized issues first.
* Deferred or descoped work is filed as its own issue when it is deferred. Dependencies are stated as `Depends on: #N`.
* Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, ...; `!` or a `BREAKING CHANGE:` footer for breaking changes).
