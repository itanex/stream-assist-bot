# Testing In Concert With the Twitch CLI

> Verified directly against the installed CLI (`twitch version` -> `twitch-cli/1.1.24`), via its own `--help` output - not sourced from external docs. Re-check against `--help` if the installed version changes.

## Open Items (TBD)

Gaps identified during research, not yet resolved - to be discussed further before implementation.

* **Event-trigger mechanism** - TBD. How a test spawns `twitch event trigger` and awaits the resulting WebSocket message before asserting.
* **Assertion strategy per event type** - TBD. Spy vs. DB check vs. log check for confirming a handler ran correctly.
* **Local server startup** - TBD. Currently manual (see Harness-managed server lifecycle above); whether/how to automate for local dev is still open.
* **Test file placement and DB isolation** - TBD. Where this integration spec lives relative to the existing co-located `*.spec.ts` convention, and how DB state is cleaned between triggered events in a run.

## Overview

High-level workflow for exercising this bot's Twitch integration using the [Twitch CLI](https://github.com/twitchdev/twitch-cli) instead of waiting on real Twitch activity.

## Setup (one-time, revisit as needed)

`twitch configure` against the same app client ID/secret the bot uses, so triggered events look like they came from your app. This is not a per-test-pass step - the CLI persists it to a config file and every subsequent `twitch` invocation reads from that automatically. Only revisit this if credentials rotate, the app registration changes, or you're setting up on a new machine.

* Config file location: `%APPDATA%\twitch-cli\.twitch-cli.env` (contains credentials - treat like a `.env` file).
* Existence of that file confirms `twitch configure` has been run, but not that the stored client ID/secret are still valid.
* To verify the stored credentials actually authenticate, run `twitch token` (no flags) to request an app access token - success confirms Twitch accepted the configured client ID/secret.

## Testing Workflow

1. **Pick a test surface**:
   * *Mock EventSub server* - CLI stands up a local WebSocket endpoint; useful for exercising the `EventSubWsListener` handlers in `bot/event-sub-handlers/` (follow, cheer, ban/unban, redemption, mod add/remove, raid to/from) without waiting on real Twitch activity.
   * *Mock API server* - CLI fakes Helix API responses, for code paths that call out to Twitch's REST API rather than reacting to events.
2. **Point the bot at the mock**, not live Twitch, for the duration of the test run - a deliberate dev-only config swap, since the app normally connects to Twitch's real EventSub endpoint.
3. **Trigger events** from the CLI, one per handler being validated.
4. **Observe outcomes** - Winston log output, DB writes, overlay/websocket broadcast - to confirm the handler did what it should.
5. **Tear down** - stop the mock server, swap config back to live Twitch.

## Test Outline: Mock Integration Layer

### Layer under test

`bot/event-sub-handlers/*.spec.ts` already unit-tests handler *logic* - a fabricated event object called directly against the handler method, DB/logger mocked. Not this layer's target.

This targets the runtime event-routing underneath those handlers: the real `EventSubWsListener` connection, subscription registration, and event dispatch. `@twurple/eventsub-ws`'s `EventSubWsListener` config accepts a `url` override, so it can be pointed at the CLI's mock WebSocket server instead of live Twitch.

### Framework

Jest, same as the rest of the suite - but as an integration test, not a unit test. No mocking the transport itself, per the project's existing "integration tests use the real thing" convention. The mock EventSub server (`twitch event websocket start-server`) is an external dependency the test run expects to be up, same relationship existing DB integration tests have with Postgres.

### Test items

* Connection handshake - listener connects to the mock server, receives `session_welcome`, reaches ready state
* Subscription registration - each subscribed type (follow, cheer, ban/unban, redemption, mod add/remove, raid to/from) is accepted by the mock server
* Event dispatch - `twitch event trigger <type> -T websocket` fires an event, correct handler method is invoked with a correctly-shaped payload
* Reconnect handling - `twitch event websocket reconnect` triggers reconnect without dropping subscriptions
* Malformed/duplicate events - a repeated or bad `event-id` doesn't crash the listener or double-invoke a handler
* Teardown - closing the session stops the listener cleanly (relevant since this project already runs Jest with `--detectOpenHandles`)

### Template

Shape only, no assertions filled in - illustrates the difference from the existing handler unit-test pattern (real listener/mock server, not a fabricated event object passed straight to a handler method).

```typescript
import 'reflect-metadata';
import { EventSubWsListener } from '@twurple/eventsub-ws';
// ...construct real ApiClient + real event-sub handlers directly, no jest.mock of transport

const MOCK_WS_URL = 'ws://127.0.0.1:8080/ws'; // twitch event websocket start-server

describe('EventSub WS Integration (mock server)', () => {
    let listener: EventSubWsListener;

    beforeAll(async () => {
        // assumes `twitch event websocket start-server` is already running externally
        listener = new EventSubWsListener({ apiClient: /* real */, url: MOCK_WS_URL });
        listener.start();
        // await session_welcome / ready state
    });

    afterAll(async () => {
        listener.stop();
        // assert no lingering handles - project runs Jest with --detectOpenHandles
    });

    it('registers expected subscriptions on connect', async () => {
        // assert each subscription type is accepted by the mock server
    });

    it('dispatches a triggered event to the correct handler', async () => {
        // shell out: twitch event trigger channel.follow -T websocket
        // assert the real handler's observable side effect (DB write, log, broadcast)
    });

    it('survives a forced reconnect', async () => {
        // shell out: twitch event websocket reconnect
        // assert listener re-subscribes without dropping events
    });

    it('does not double-invoke on a duplicate event id', async () => {
        // trigger the same event-id twice, assert handler side effect happened once
    });
});
```

### Harness-managed server lifecycle (future exploration)

Not yet implemented - the Template above still assumes the mock server is already running externally. Worth exploring later: having the test harness start and tear down the mock server itself, so local dev doesn't require a manually-started process.

Two Jest-native mechanisms exist for this:

* **`globalSetup`/`globalTeardown`** - runs once per `jest` invocation, for the whole suite. Not currently configured in this project's `jest.config.js`.
* **Per-suite `beforeAll`/`afterAll`**, scoped to just the integration spec file - only that file pays the startup cost.

Note the existing precedent cuts the other way: this project's Postgres integration-test dependency is externally managed (developer starts it, Jest doesn't), not harness-managed. Automating the mock server's lifecycle would be a deliberate departure from that convention, made specifically because the mock server is cheap and self-contained (no persistent data, unlike Postgres).

This may overlap with the initial docker setup planned in issue #103 - worth coordinating with that work rather than solving it twice.

### CI integration

Running the mock EventSub server as a CI test dependency (process lifecycle, port binding) is tracked separately in issue #103, not this doc.

## Coverage Surface

Twitch interactions used by this app split into three integration types, with different coverage:

* **EventSub** - fully coverable. Every subscribed event type maps to a supported `twitch event trigger` event, so the mock EventSub server can exercise the complete EventSub surface this app uses.
* **Helix API** - fully coverable. The API calls this app makes are all served by `mock-api start`, including realistic scope enforcement on privileged endpoints: a mock token missing a required scope returns the same 401 response a live token missing that scope would return.
* **Chat (IRC)** - not coverable. The CLI has no chat/IRC mock. Command *logic* can still be unit-tested directly against a handler's `handle()` method, but the live `ChatClient` connection and message-dispatch wiring can't be exercised through the CLI at all.

### Known caveat: port collisions

`mock-api start` and `event websocket start-server` both default to port 8080 - the same default as this app's own `TWITCH_WEBSOCKET_PORT`. If the app is already running locally, a mock server started without `-p`/`--port` can fail to bind, or requests can silently land on the app's own server instead of the mock. Always pass an explicit, non-conflicting port when running mocks alongside a live app instance.

## FAQ

**Does every test pass need to redo the Setup step?**

> No. `twitch configure` writes to a persistent config file, read automatically by every later invocation. Only redo it on credential rotation, app registration changes, or a new machine.

**Does the CLI require valid credentials for the mocked interfaces?**

> No. `event websocket start-server` and `mock-api start` take no auth flags and run fully local. `event` / `event trigger` also expose `-D/--no-config` to explicitly skip configuration. Credentials only matter for `twitch token` and real API calls.

### Out of scope

Chat message flow (the `!command` handlers) isn't covered by this workflow - the Twitch CLI doesn't mock IRC chat, so that path still needs a real or test Twitch account in actual chat.
