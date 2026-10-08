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
    leadMod?: boolean;
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
    handle(channel: string, command: string, userstate: ChatUser, message: string, args?: any, resolveChannel?: () => Promise<string>): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `exp` | `RegExp` | Pattern matched against the raw chat message. The first capture group is the command name; subsequent groups become `args`. |
| `commandName` | `CommandName?` | Key into the database-backed response text - a `defaultResponses` key (seeded texts) or a `CommandFamilies` key (a family with no seeded texts). Every command that says text in chat declares one. |
| `timeout` | `number` | Cooldown period in seconds. Privileged users (mod, VIP, subscriber, etc.) receive half this duration. |
| `leadMod` | `boolean` | (optional) Allow channel lead moderators. |
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
| `leadMod` | `ChatUser.isLeadMod` | Channel Lead Moderator |
| `mod` | `ChatUser.isMod` | Channel Moderator |
| `vip` | `ChatUser.isVip` | |
| `artist` | `ChatUser.isArtist` | Channel Artist badge |
| `founder` | `ChatUser.isFounder` | A permanent badge from early subscription - the holder may no longer be subscribed or following |
| `subscriber` | `ChatUser.isSubscriber` | A temporary badge the holder receives from subscribing or receiving a sub to the channel |
| `follower` | `broadcaster.isFollowedBy(userId)` | Async API call; resolved before authorization |
| `viewer` | _(always true)_ | Open to everyone in chat |

Broadcaster (`ChatUser.isBroadcaster`) always passes regardless of flags.

### Implied Relationships

* **Subscriber implies follower.** Twitch requires following before subscribing. A subscriber satisfies any command that allows followers.
* **Roles do not imply subscription.** A mod or VIP who is not subscribed does not satisfy `subscriber: true`.

### Authorization Logic

```
broadcaster          -> always authorized
leadMod flag + isLeadMod     -> authorized
mod flag + isLeadMod     -> authorized
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

All command response text lives in the database (`CommandResponse` table), making it editable at runtime without a redeploy. Commands hold no response text of their own - no inline strings, no response arrays, no fallback.

* `defaultResponses` (`bot/utilities/default-responses.ts`) is the seed source only. It is shaped `commandName -> variant -> texts[]`; commands never read it directly.
* On startup, `CommandResponseService.initialize()` seeds `defaultResponses` into an empty `CommandResponse` table, then loads every row into an in-memory cache. Seeding is skipped entirely once the table holds any rows, so new `defaultResponses` entries do not reach an already-seeded database.
* Reads never hit the database per-message. Writes through the service keep the cache in sync; rows edited directly in the database are not visible until restart.
* A command reads its text via `CommandResponseService.getCommandResponse(this.commandName, variant)`. When a variant holds several texts, one is picked at random.

### Missing text

If `getCommandResponse` returns nothing, the command logs a warning that carries the variant (`{ variant }`) and says nothing in chat. There is no fallback to `''` or to built-in text.

### Making a command's response editable

1. Add the texts to `defaultResponses` under the command's name and variant(s), written with `%token%` placeholders for any dynamic content
2. Declare `commandName` on the command class referencing that key
3. Inject `CommandResponseService` and read the text in `handle` with the variant the code path needs
4. Build a `TransientContext` supplying a value for every token the template uses, and pass both to `templateResolver` (see [Template Rendering](#template-rendering))
5. On a miss, log the warning with the variant and say nothing

### Variants

Every response row belongs to a `commandName` and a variant (`''` is the default variant). Variants are used in three ways:

* **Default only** - the command only reads `''`, which can hold several texts to choose from (e.g. `about`, `fall`, `eightball`).
* **Command-driven** - the chat user picks the variant through an argument captured by `exp` (e.g. `!socials discord`).
* **Programmatic** - the command's own branches pick from a fixed set of variants (e.g. `hug` uses `''`, `self`, `notfound`; `uptime` uses `''` and `offline`). Language form - singular vs plural, "Today", whether a category is quoted - is expressed as separate variants, so the text lives in the template rather than in code.

### Command Families

`CommandFamilies` (`bot/utilities/default-responses.ts`) registers command names that have **no** `defaultResponses` entry (e.g. `socials`, whose variants are created at runtime). A name belongs in exactly one of the two registries; `CommandName` is the union of both.

* `isValidCommandName` checks `CommandFamilies` only, so the `add` verb accepts family names only (see [Editing Reponses from Chat](#editing-reponses-from-chat)).
* Family rows exist only once created via `add`.

---

## Template Rendering

`templateResolver` (`bot/utilities/template-resolver.ts`) substitutes `%token%` placeholders in a response string against a supplied context object.

```typescript
templateResolver(template: string, context: TransientContext, logger: winston.Logger): string
```

* Placeholders use `%tokenname%` syntax, matched case-insensitively
* `context` is a `TransientContext` - a partial record keyed by `TransientKeyword`, the union of names registered in `transientKeywords` (`bot/utilities/default-responses.ts`)
* Token names are a shared, generic vocabulary (e.g. `targetuser`, `speakinguser`, `when`, `link`, `total`) reused across commands; each command's `context` only populates the tokens its templates use
* If a template references a token missing from `context`, `templateResolver` logs a warning and leaves the literal `%token%` text in the output - nothing enforces that a template's tokens match what the command actually supplies, so keep both in sync by hand when editing either
* Output longer than 500 characters (Twitch's chat message cap) is truncated to fit, with a `...` suffix, and a warning is logged

### Channel and Broadcaster Identity

Two different sources exist for identity-related tokens, and they are not interchangeable:

* **`Broadcaster`** (`bot/utilities/broadcaster.ts`) - the bot's own configured home channel, cached for 5 minutes. Inject it directly for a static "who is this bot's broadcaster" value (e.g. `countexhaust`, `followage`).
* **`resolveChannel`** - an optional 6th parameter on `ICommandHandler.handle()`, a `() => Promise<string>` supplied by `MessageHandler`. Resolves the channel the *specific incoming message* actually belongs to: prefers the IRC `source-room-id` tag (present during shared-chat sessions) resolved via `apiClient.users.getUserById`, falling back to the bot's home `Broadcaster` identity otherwise. It's lazy - the API lookup only happens if a command calls the function. As of now, no command implementation calls it.

---

## Editing Reponses from Chat

`ManageCommand` (`bot/commands/manage.command.ts`) provides runtime response management. Moderator or broadcaster only.

    !command add <name>.<variant> <text>
    !cmd add <name>.<variant> <text>

* `<name>` is a `commandName` value; `<name>.<variant>` targets a specific variant (e.g. `socials.discord`). The dot-compound form is chat-input only - `name` and `variant` are split apart before reaching `CommandResponseService`, storage never holds dotted keys.
* `add` creates a new response row. `<name>` must be a registered `CommandFamilies` name, and `<variant>` is required and cannot be empty - `add` cannot create a base/single-response entry.
* `add`-ing the same `<name>.<variant>` as a removed row un-deletes the row and overwrites its text with the newly supplied value, rather than failing with "already exists".
* Text is trimmed and validated (length bounds); invalid text is rejected with a chat reply and nothing is stored.
* A compound name with more than one dot (e.g. `a.b.c`) is rejected as an invalid command.
* A message missing its trailing text (e.g. `!command add socials.discord`) still matches the pattern and replies with the generic invalid-input message rather than being silently ignored.

### Edit, Remove and Restore (deferred)

Editing, removing and restoring response text operate on individual text ids and are moving to the management UI, tracked in [#159](https://github.com/itanex/stream-assist-bot/issues/159). Until then:

* `!command edit|remove|restore ...` (and `!cmd ...`) still match, but reply with "Command \<verb\> is not available from chat yet" and make no change.
* `UpdateReplies`, `RemoveReplies` and `RestoreReplies` remain exported from `manage.command.ts` for that work.

### Reply Messages

| Result | Verb | Reply |
|---|---|---|
| `invalidInput` | add | Invalid input: both [name] and [text] are required |
| `invalidText` | add | Invalid text for command '\<name\>' |
| `invalidCommandName` | add | Command \<name\> text family is not recognized |
| `alreadyExists` | add | Command \<name\> text already exists |
| `insertFailed` | add | Command \<name\> text failed to be inserted |
| `inserted` | add | Command \<name\> text was inserted |
| (deferred) | edit, remove, restore | Command \<verb\> is not available from chat yet |

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
* `viewer: true` - open to everyone (all other flags become irrelevant)
* `follower: true` - requires following; set this for community participation commands
* `subscriber: true` + `founder: true` - subscriber-exclusive perks
* `vip: true` - high-trust viewer privilege
* `leadMod: true` - lead moderation or privileged commands; exclude subscriber/follower/viewer
* `mod: true` - moderation or privileged commands; exclude subscriber/follower/viewer
* Multiple flags can be `true` simultaneously (a mod can also be a subscriber - both paths authorize them)

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

---

## Direct Repository Access (Known Exception)

Commands access data through services only (see [Architecture - Layers and Dependency Direction](architecture.md#layers-and-dependency-direction)); response text is read only through `CommandResponseService`.

The following commands still inject a repository directly because no service exists for it yet. Tracked in [#158](https://github.com/itanex/stream-assist-bot/issues/158). New commands must not add to this list.

| Repository | Commands |
|---|---|
| `LurkRespository` | `LurkCommand`, `UnLurkCommand`, `WhoIsLurkingCommand`, `clearLurkingUsers` |
| `DeathCountRepository` | `DeathCommand`, `DeathCountCommand`, `LastDeathCountCommmand` |
| `RaidRepository` | `LastRaidCommand` |
| `SubscriberRepository` | `LastSubCommand` |
