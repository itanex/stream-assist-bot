# Command System

## Overview

Commands are discrete units of chat functionality. Each command is a class implementing `ICommandHandler`, registered in the Inversify DI container, and discovered automatically by `MessageHandler` at runtime.

`MessageHandler` (`bot/handlers/message.handler.ts`) is responsible for:
1. Matching the incoming chat message against each command's `exp` pattern
2. Checking whether the stream is live (vs offline) against the command's `restriction`
3. Resolving whether the sending user holds a role that satisfies the command's permission flags
4. Enforcing the command cooldown

---

## The `ICommandHandler` Interface

```typescript
export interface ICommandHandler {
    exp: RegExp;
    commandName?: CommandName;
    timeout: number;
    mod: boolean;
    vip: boolean;
    artist: boolean;
    founder: boolean;
    subscriber: boolean;
    follower: boolean;
    viewer: boolean;
    isGlobalCommand: boolean;
    restriction: OnlineState;
    cooldownKey?(args: string[]): string;
    handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `exp` | `RegExp` | Pattern matched against the raw chat message. The first capture group is the command name; subsequent groups become `args`. |
| `commandName` | `CommandName?` | Key into the database-backed response text - either a `defaultResponses` key (single fixed text) or a `CommandFamilies` key (multiple variants). Omit for commands with computed or fixed responses. |
| `timeout` | `number` | Cooldown period in seconds. Privileged users (mod, VIP, subscriber, etc.) receive half this duration. |
| `mod` | `boolean` | Allow channel moderators. |
| `vip` | `boolean` | Allow VIPs. |
| `artist` | `boolean` | Allow users with the Artist channel role. |
| `founder` | `boolean` | Allow Founders (earliest subscribers). Must match `subscriber` - if `subscriber: true`, set `founder: true`. |
| `subscriber` | `boolean` | Allow current subscribers. |
| `follower` | `boolean` | Allow followers (non-subscribers who follow). |
| `viewer` | `boolean` | Allow anyone in chat, including non-followers. |
| `isGlobalCommand` | `boolean` | When `true`, the cooldown is shared across all users. Per-user cooldown is not yet implemented. |
| `restriction` | `OnlineState` | `'always'` - runs any time. `'online'` - only while stream is live. `'offline'` - only while stream is offline. |
| `cooldownKey` | `(args: string[]) => string` (optional method) | Overrides the default cooldown bucket. When implemented, `MessageHandler` buckets the cooldown timer on this method's return value instead of the class name. When absent, falls back to today's behavior (bucketed by class name). |

---

## Permission Model (RBAC)

Authorization is role-based. A command declares which roles are permitted via its boolean flags. A user is authorized if they hold **at least one** of the allowed roles.

### Roles and Twurple Properties

| Flag | Twurple property | Notes |
|---|---|---|
| `mod` | `ChatUser.isMod` | Covers Lead Mod - Twurple does not distinguish |
| `vip` | `ChatUser.isVip` | |
| `artist` | `ChatUser.isArtist` | Channel Artist badge |
| `founder` | `ChatUser.isFounder` | A permanent badge from early subscription - the holder may no longer be subscribed or following |
| `subscriber` | `ChatUser.isSubscriber` | A temporary badge the holder receives from subscribing or receiving a sub to the channel |
| `follower` | `broadcaster.isFollowedBy(userId)` | Async API call; resolved before authorization |
| `viewer` | _(always true)_ | Open to everyone in chat |

Broadcaster (`ChatUser.isBroadcaster`) always passes regardless of flags.

### Implied Relationships

- **Subscriber implies follower.** Twitch requires following before subscribing. A subscriber satisfies any command that allows followers.
- **Roles do not imply subscription.** A mod or VIP who is not subscribed does not satisfy `subscriber: true`.

### Authorization Logic

```
broadcaster          -> always authorized
mod flag + isMod     -> authorized
vip flag + isVip     -> authorized
artist flag + isArtist -> authorized
founder flag + isFounder -> authorized
subscriber flag + isSubscriber -> authorized
follower flag + (isFollower OR isSubscriber) -> authorized
viewer flag          -> authorized
otherwise            -> denied
```

---

## Cooldown Behavior

The `timeout` value is the base cooldown in seconds. Privileged users (founder, mod, subscriber, VIP, artist) receive `timeout / 2`. The broadcaster has no cooldown.

Global cooldowns (`isGlobalCommand: true`) are shared - once any user triggers the cooldown, the command is unavailable to everyone until the period expires.

### Custom Cooldown Buckets

By default, the cooldown timer is bucketed by the command's class name - one shared timer per command. A command can override this by implementing `cooldownKey(args)`, returning a different bucket key per invocation (e.g. bucketing by variant, so `!socials discord` and `!socials twitter` don't share a cooldown). When `cooldownKey` is absent, `MessageHandler` falls back to the class name, matching today's behavior.

The cooldown chat message always names the command (its class name), regardless of which bucket key was actually used internally - the bucket key is bookkeeping only, never displayed.

---

## Database-Backed Responses

Command response text can live in the database (`CommandResponse` table) instead of the class, making it editable at runtime without a redeploy.

* Default text is declared in `bot/utilities/default-responses.ts`. `CommandName` is derived from its keys plus `CommandFamilies`' keys, so a command's `commandName` must have a matching entry in one of the two or the build fails.
* On startup, `CommandResponseService.initialize()` seeds any missing rows from the defaults. Existing rows are never overwritten - edits survive restarts.
* Responses are cached in memory at startup and kept in sync on writes. Reads never hit the database per-message. Rows edited directly in the database are not visible until restart.
* A command reads its response via `CommandResponseService.getCommandText(this.commandName)`, falling back to its `defaultResponses` entry if the lookup misses.

### Making a command's response editable

1. Add an entry to `defaultResponses` with the command's trigger word as the key
2. Declare `commandName` on the command class referencing that key
3. Inject `CommandResponseService` and read the text in `handle`

### Command Families and Variants

Some commands respond with one of several named variants rather than a single text response (e.g. `!socials discord` vs `!socials twitter`). These set `commandName` to a `CommandFamilies` key instead of a `defaultResponses` key - the same field serves both cases.

* Families are declared in the `CommandFamilies` registry (`bot/utilities/default-responses.ts`). A command sets `commandName` to one of these registered names.
* Unlike single-reponse commands, family variants are never seeded from `defaultResponses` - that seed path only populates single-reponse commands. Family variant rows exist only once created via the `add` verb (see [Editing Reponses from Chat](#editing-reponses-from-chat)).
* `CommandResponseService.getCommandText(commandName, variant?)` takes an optional `variant`. Omitting it looks up the base/empty-variant entry for that name.
* A command reads its variant text via `CommandResponseService.getCommandText(this.commandName, variant)`, where `variant` comes from its own capture group in `exp`.

Whether a `commandName` value resolves to a single fixed reponse or a family of reponses depends only on which registry it's drawn from - `defaultResponses` or `CommandFamilies` - not on a separate field.

---

## Editing Reponses from Chat

`ManageCommand` (`bot/commands/manage.command.ts`) provides runtime response editing. Moderator or broadcaster only.

    !command add <name>[.<variant>] <text>
    !command edit <name>[.<variant>] <text>
    !cmd add <name>[.<variant>] <text>
    !cmd edit <name>[.<variant>] <text>

* `<name>` is a `commandName` value - either a `defaultResponses` key or a `CommandFamilies` key; `<name>.<variant>` targets a specific family variant (e.g. `socials.discord`). The dot-compound form is chat-input only - `name` and `variant` are split apart before reaching `CommandResponseService`, storage never holds dotted keys.
* `add` creates a new response row. `<name>` must be a registered `CommandFamilies` name, and `<variant>` is required and cannot be empty - `add` cannot create a base/single-reponse entry.
* `edit` updates an existing row - a family variant or a single-response command. Only commands with an existing reponse row are editable - anything else replies "does not have an editable text"
* Text is trimmed and validated (length bounds); invalid text is rejected with a chat reply and the stored text is unchanged
* A compound name with more than one dot (e.g. `a.b.c`) is rejected as an invalid command
* Known behavior: a message missing the text entirely (`!command edit about`) does not match the pattern and is silently ignored
* `remove` is not yet implemented - reponses can be added and edited, not deleted, from chat

### Reply Messages

| Result | Verb | Reply |
|---|---|---|
| `invalidInput` | add, edit | Invalid input: both [name] and [text] are required |
| `invalidText` | add, edit | Invalid text for command '\<name\>' |
| `invalidCommandName` | add | Command \<name\> text family is not recognized |
| `alreadyExists` | add | Command \<name\> text already exists |
| `inserted` | add | Command \<name\> text was inserted |
| `notEditable` | edit | Command \<name\> does not have an editable text |
| `updated` | edit | Command \<name\> text was updated |
| `updateFailed` | edit | Command \<name\> text failed to update |

---

## Adding a New Command

### 1. Create the class

Create a file in `bot/commands/`. Implement `ICommandHandler`:

```typescript
import { ChatClient, ChatUser } from '@twurple/chat';
import { inject, injectable } from 'inversify';
import { ICommandHandler, OnlineState } from './iCommandHandler';
import InjectionTypes from '../../dependency-management/types';

@injectable()
export class MyCommand implements ICommandHandler {
    exp: RegExp = /^!(mycommand)$/i;
    timeout: number = 10;
    mod: boolean = false;
    vip: boolean = false;
    artist: boolean = false;
    founder: boolean = true;   // must match subscriber
    subscriber: boolean = true;
    follower: boolean = false;
    viewer: boolean = false;
    isGlobalCommand: boolean = true;
    restriction: OnlineState = 'online';

    constructor(
        @inject(ChatClient) private chatClient: ChatClient,
        @inject(InjectionTypes.Logger) private logger: winston.Logger,
    ) {}

    async handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, 'Hello!');
        this.logger.info(`* Executed ${command} in ${channel} || ${userstate.displayName} > ${message}`);
    }
}
```

**Flag guidance:**
- `viewer: true` - open to everyone (all other flags become irrelevant)
- `follower: true` - requires following; set this for community participation commands
- `subscriber: true` + `founder: true` - subscriber-exclusive perks
- `vip: true` - high-trust viewer privilege
- `mod: true` - moderation or privileged commands; exclude subscriber/follower/viewer
- Multiple flags can be `true` simultaneously (a mod can also be a subscriber - both paths authorize them)

### 2. Register in the DI container

In `dependency-management/inversify.config.ts`, add a multi-binding under `InjectionTypes.CommandHandlers`:

```typescript
container.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(MyCommand);
```

`MessageHandler` discovers all bound command handlers automatically via `@multiInject`.

### 3. Export from the index

Add the export to `bot/commands/index.ts` so the class is importable from the module root.

---

## Deferred Roles

The following Twitch roles are not yet represented as permission flags because they have no direct boolean property on Twurple's `ChatUser` type. Access requires badge inspection. Tracked in issue #96.

| Role | Detection method |
|---|---|
| Editor | `chatUser.badges.has('editor')` (badge key TBC) |
| Business Manager | `chatUser.badges.has(...)` (badge key TBC) |
