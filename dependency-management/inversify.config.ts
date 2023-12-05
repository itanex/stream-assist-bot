// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ApiClient, ApiConfig } from '@twurple/api';
import { ChatClient } from '@twurple/chat';
import { Container } from 'inversify';
import winston from 'winston';
import {
    AboutCommand,
    AccountAgeCommand,
    CharityCommand,
    CountExhaustCommand,
    CuddleCommand,
    DeathCommand,
    DeathCountCommand,
    DiceCommand,
    DivideByZeroCommand,
    DrinkCommand,
    EightBallCommand,
    FallCommand,
    FollowAgeCommand,
    GiveAwayCommand,
    HelpCommand,
    HugCommand,
    LastDeathCountCommmand,
    LastRaidCommand,
    LastSubCommand,
    LurkCommand,
    UnLurkCommand,
    WhoIsLurkingCommand,
    ShoutOutCommand,
    SocialsCommand,
    UpTimeCommand,
    WishListCommand,
    ICommandHandler,
} from '../bot/commands';
import logger from '../logger/logger';
import ChatBot from '../bot/chat-bot';
import environment from '../configurations/environment';
import {
    FollowHandler,
    IFollowStreamEvent,
    IRaidStreamEvent,
    ISubscriptionStreamEvent,
    MessageHandler,
    RaidHandler,
    SubscriptionHandlers,
} from '../bot/handlers';
import { Broadcaster } from '../utilities/broadcaster';
import { TYPES } from './types';
import Database from '../database/database';
import authProvider from './auth/authProvider';

const SAContainer = new Container();

SAContainer.bind<Database>(Database).toSelf().inSingletonScope();

SAContainer.bind<Broadcaster>(Broadcaster).toSelf().inSingletonScope();

SAContainer.bind<ChatBot>(ChatBot).toSelf().inSingletonScope();

// Bot Stream Event Handler bindings
// SAContainer.bind<IFollowStreamEvent>(FollowHandler).toSelf();
SAContainer.bind(MessageHandler).toSelf();
SAContainer.bind<IRaidStreamEvent>(RaidHandler).toSelf();
SAContainer.bind<ISubscriptionStreamEvent>(SubscriptionHandlers).toSelf();

// Bot Command Handler bindings
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(AboutCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(AccountAgeCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(CharityCommand);
// SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(collabadd);
// SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(collab);
// SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(collabdisable);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(CountExhaustCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(CuddleCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(DeathCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(DeathCountCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(DiceCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(DivideByZeroCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(DrinkCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(EightBallCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(FallCommand);
// SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(FollowAgeCommand);
// SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(GiveAwayCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(HelpCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(HugCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(LastDeathCountCommmand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(LastRaidCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(LastSubCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(LurkCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(UnLurkCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(WhoIsLurkingCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(ShoutOutCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(SocialsCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(UpTimeCommand);
SAContainer.bind<ICommandHandler>(TYPES.CommandHandlers).to(WishListCommand);

// Bind dependencies to container
SAContainer
    .bind<winston.Logger>(TYPES.Logger)
    .toConstantValue(logger);

SAContainer
    .bind(ChatClient)
    .toConstantValue(
        new ChatClient({
            authProvider,
            channels: [environment.channel],
            botLevel: 'none',
            isAlwaysMod: true,
            requestMembershipEvents: true,
        }),
    );

SAContainer
    .bind(ApiClient)
    .toConstantValue(
        new ApiClient(<ApiConfig>{
            authProvider,
        }),
    );

export { SAContainer };
