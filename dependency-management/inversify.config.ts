import 'reflect-metadata';
import { ApiClient, ApiConfig } from '@twurple/api';
import { ChatClient, LogLevel } from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { Container } from 'inversify';
import winston from 'winston';
import {
    AboutCommand,
    AccountAgeCommand,
    BrainCommand,
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
    HelpCommand,
    HugCommand,
    LastDeathCountCommmand,
    LastRaidCommand,
    LastSubCommand,
    LurkCommand,
    UnLurkCommand,
    WhoIsLurkingCommand,
    ManageCommand,
    ShoutOutCommand,
    SocialsCommand,
    UpTimeCommand,
    WishListCommand,
    ICommandHandler,
    ThrowCommand,
} from '../bot/commands/index.js';
import logger from '../logger/logger.js';
import ChatBot, { type IChatBot } from '../bot/chat-bot.js';
import environment, { type Environment } from '../configurations/environment.js';
import {
    FollowHandler,
    IFollowStreamEvent,
    IRaidStreamEvent,
    ISubscriptionHandler,
    MessageHandler,
    RaidHandler,
    SubscriptionHandler,
} from '../bot/handlers/index.js';
import {
    BanEventHandler,
    ChannelPointEventHandler,
    CheerEventHandler,
    FollowerEventHandler,
    ModeratorEventHandler,
    RaidEventHandler,
    StreamEventHandler,
} from '../bot/event-sub-handlers/index.js';
import Broadcaster from '../bot/utilities/broadcaster.js';
import InjectionTypes from './types.js';
import Database, { IDatabaseConfiguration } from '../database/database.js';
import authProvider from '../bot/auth/authProvider.js';
import Scheduler from '../bot/scheduler.js';
import { SocketServer, ISocketServer } from '../bot/overlay/socket.server.js';
import OverlayServer, { IOverlayServer } from '../bot/overlay/overlay.server.js';
import AuthenticationServer, { IAuthenticationServer } from '../bot/auth/auth.server.js';
import StreamStateService from '../bot/utilities/stream-state.service.js';
import JoinGreetingHandler from '../bot/handlers/join-greeting.handler.js';
import {
    BanEventRepository,
    ChannelEventRepository,
    CommandResponseRepository,
    LurkRespository,
    RaidRepository,
    SubscriberRepository,
} from '../bot/repositories/index.js';

const SAContainer = new Container();

SAContainer.bind<Database>(Database).toSelf().inSingletonScope();
SAContainer.bind<Environment>(InjectionTypes.Environment).toConstantValue(environment);

SAContainer.bind<Broadcaster>(Broadcaster).toSelf().inSingletonScope();
SAContainer.bind<StreamStateService>(StreamStateService).toSelf().inSingletonScope();

SAContainer.bind<BanEventRepository>(BanEventRepository).toSelf().inSingletonScope();
SAContainer.bind<ChannelEventRepository>(ChannelEventRepository).toSelf().inSingletonScope();
SAContainer.bind<CommandResponseRepository>(CommandResponseRepository).toSelf().inSingletonScope();
SAContainer.bind<LurkRespository>(LurkRespository).toSelf().inSingletonScope();
SAContainer.bind<RaidRepository>(RaidRepository).toSelf().inSingletonScope();
SAContainer.bind<SubscriberRepository>(SubscriberRepository).toSelf().inSingletonScope();

SAContainer.bind<IChatBot>(ChatBot).toSelf().inSingletonScope();

SAContainer.bind<Scheduler>(Scheduler).toSelf().inSingletonScope();
SAContainer.bind<ISocketServer>(SocketServer).toSelf().inSingletonScope();
SAContainer.bind<IOverlayServer>(OverlayServer).toSelf().inSingletonScope();
SAContainer.bind<IAuthenticationServer>(AuthenticationServer).toSelf().inSingletonScope();

// Bot Stream Event Handler bindings
// SAContainer.bind<IFollowStreamEvent>(FollowHandler).toSelf();
SAContainer.bind(MessageHandler).toSelf();
SAContainer.bind(JoinGreetingHandler).toSelf().inSingletonScope();
SAContainer.bind<IRaidStreamEvent>(RaidHandler).toSelf();
SAContainer.bind<ISubscriptionHandler>(SubscriptionHandler).toSelf();

// Bot Command Handler bindings
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(AboutCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(AccountAgeCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(BrainCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(CountExhaustCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(CuddleCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(DeathCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(DeathCountCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(DiceCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(DivideByZeroCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(DrinkCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(EightBallCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(FallCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(FollowAgeCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(HelpCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(HugCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastDeathCountCommmand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastRaidCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastSubCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LurkCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(UnLurkCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(WhoIsLurkingCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(ManageCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(ShoutOutCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(SocialsCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(ThrowCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(UpTimeCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(WishListCommand);

// Event Sub Handlers
SAContainer.bind(BanEventHandler).toSelf();
SAContainer.bind(ChannelPointEventHandler).toSelf();
SAContainer.bind(CheerEventHandler).toSelf();
SAContainer.bind(FollowerEventHandler).toSelf();
SAContainer.bind(ModeratorEventHandler).toSelf();
SAContainer.bind(RaidEventHandler).toSelf();
SAContainer.bind(StreamEventHandler).toSelf();

// Bind dependencies to container
SAContainer
    .bind<IDatabaseConfiguration>(InjectionTypes.DatabaseConfiguration)
    .toConstantValue(environment.databaseConfig);

SAContainer
    .bind<winston.Logger>(InjectionTypes.Logger)
    .toConstantValue(logger);

SAContainer
    .bind(ChatClient)
    .toConstantValue(
        new ChatClient({
            authProvider,
            channels: [environment.twitchBot.channel!],
            botLevel: 'none',
            isAlwaysMod: true,
            requestMembershipEvents: true,
            logger: {
                custom: {
                    log: (level: LogLevel, message) => {
                        logger.info(`Level (${level}): ${message}`);
                    },
                    // crit: logger.crit,
                    debug: message => {
                        logger.debug(message);
                    },
                    error: message => {
                        logger.error(message);
                    },
                    info: message => {
                        logger.info(message);
                    },
                    trace: message => {
                        logger.debug(`TRACE: ${message}`);
                    },
                    // warn: logger.warn,
                },
            },
        }),
    );

SAContainer
    .bind(ApiClient)
    .toConstantValue(
        new ApiClient(<ApiConfig>{
            authProvider,
            logger: {
                custom: {
                    log: (level: LogLevel, message) => {
                        logger.info(`Level (${level}): ${message}`);
                    },
                    // crit: logger.crit,
                    debug: message => {
                        logger.debug(message);
                    },
                    error: message => {
                        logger.error(message);
                    },
                    info: message => {
                        logger.info(message);
                    },
                    trace: message => {
                        logger.debug(`TRACE: ${message}`);
                    },
                    // warn: logger.warn,
                },
            },
        }),
    );

SAContainer
    .bind(EventSubWsListener)
    .toConstantValue(
        new EventSubWsListener({
            apiClient: SAContainer.get<ApiClient>(ApiClient),
        }),
    );

export default SAContainer;
