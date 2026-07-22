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
    phraseKey?: PhraseKey;
    phraseFamily?: PhraseFamily;
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
    handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `exp` | `RegExp` | Pattern matched against the raw chat message. The first capture group is the command name; subsequent groups become `args`. |
| `phraseKey` | `PhraseKey?` | Key into the phrase table for commands with database-backed response text. Omit for commands with computed or fixed responses. Mutually exclusive with `phraseFamily`. |
| `phraseFamily` | `PhraseFamily?` | Registers the command against a family of variant-based phrases (see [Phrase Families and Variants](#phrase-families-and-variants)). Mutually exclusive with `phraseKey`. |
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

## Database-Backed Phrases

Command response text can live in the database (`CommandPhrase` table) instead of the class, making it editable at runtime without a redeploy.

* Default text is declared in `bot/utilities/default-phrases.ts`. The `PhraseKey` type is derived from its keys, so a command's `phraseKey` must have a matching entry or the build fails.
* On startup, `PhraseService.initialize()` seeds any missing rows from the defaults. Existing rows are never overwritten - edits survive restarts.
* Phrases are cached in memory at startup and kept in sync on writes. Reads never hit the database per-message. Rows edited directly in the database are not visible until restart.
* A command reads its phrase via `PhraseService.getCommandTemplate(this.phraseKey)`, falling back to its `defaultPhrases` entry if the lookup misses.

### Making a command's phrase editable

1. Add an entry to `defaultPhrases` with the command's trigger word as the key
2. Declare `phraseKey` on the command class referencing that key
3. Inject `PhraseService` and read the template in `handle`

### Phrase Families and Variants

Some commands respond with one of several named variants rather than a single template (e.g. `!socials discord` vs `!socials twitter`). These register a `phraseFamily` instead of a `phraseKey`.

* Families are declared in the `phraseFamilies` registry (`bot/utilities/default-phrases.ts`) and typed as `PhraseFamily`. A command sets `phraseFamily` to one of these registered names.
* Unlike single-phrase commands, family variants are never seeded from `defaultPhrases` - that seed path only populates single-phrase (`phraseKey`) commands. Family variant rows exist only once created via the `add` verb (see [Editing Phrases from Chat](#editing-phrases-from-chat)).
* `PhraseService.getCommandTemplate(commandName, variant?)` takes an optional `variant`. Omitting it looks up the base/empty-variant entry for that name.
* A command reads its variant template via `PhraseService.getCommandTemplate(this.phraseFamily, variant)`, where `variant` comes from its own capture group in `exp`.

`phraseKey` and `phraseFamily` are mutually exclusive - a command is either a single fixed-key phrase or a family of variants, not both.

---

## Editing Phrases from Chat

`ManageCommand` (`bot/commands/manage.command.ts`) provides runtime phrase editing. Moderator or broadcaster only.

    !command add <name>[.<variant>] <template>
    !command edit <name>[.<variant>] <template>
    !cmd add <name>[.<variant>] <template>
    !cmd edit <name>[.<variant>] <template>

* `<name>` is a phrase key or a phrase family name; `<name>.<variant>` targets a specific family variant (e.g. `socials.discord`). The dot-compound form is chat-input only - `name` and `variant` are split apart before reaching `PhraseService`, storage never holds dotted keys.
* `add` creates a new phrase row. `<name>` must be a registered phrase family, and `<variant>` is required and cannot be empty - `add` cannot create a base/single-phrase entry.
* `edit` updates an existing row - a family variant or a single-phrase command. Only commands with an existing phrase row are editable - anything else replies "does not have an editable phrase"
* Templates are trimmed and validated (length bounds); invalid templates are rejected with a chat reply and the stored phrase is unchanged
* A compound name with more than one dot (e.g. `a.b.c`) is rejected as an invalid command
* Known behavior: a message missing the template entirely (`!command edit about`) does not match the pattern and is silently ignored
* `remove` is not yet implemented - phrases can be added and edited, not deleted, from chat

### Reply Messages

| Result | Verb | Reply |
|---|---|---|
| `invalidInput` | add, edit | Invalid input: both [name] and [template] are required |
| `invalidTemplate` | add, edit | Invalid template for command '\<name\>' |
| `invalidCommandName` | add | Command \<name\> phrase family is not recognized |
| `alreadyExists` | add | Command \<name\> phrase already exists |
| `inserted` | add | Command \<name\> phrase was inserted |
| `notEditable` | edit | Command \<name\> does not have an editable phrase |
| `updated` | edit | Command \<name\> phrase was updated |
| `updateFailed` | edit | Command \<name\> phrase failed to update |

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

    async handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void> {
        this.chatClient.say(channel, 'Hello!');
        this.logger.info(`* Executed ${commandName} in ${channel} || ${userstate.displayName} > ${message}`);
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
