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
    handle(channel: string, commandName: string, userstate: ChatUser, message: string, args?: any): Promise<void>;
}
```

### Properties

| Property | Type | Description |
|---|---|---|
| `exp` | `RegExp` | Pattern matched against the raw chat message. The first capture group is the command name; subsequent groups become `args`. |
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
- **Founder implies follower.** Same logic - founders subscribed, and subscribing requires following.
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
