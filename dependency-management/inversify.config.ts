// reflect-metadata should be imported
// before any interface or other imports
// also it should be imported only once
// so that a singleton is created.
import 'reflect-metadata';
import { ApiClient, ApiConfig } from '@twurple/api';
import { ChatClient, LogLevel } from '@twurple/chat';
import { EventSubWsListener } from '@twurple/eventsub-ws';
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
import Broadcaster from '../bot/utilities/broadcaster';
import InjectionTypes from './types';
import Database from '../database/database';
import authProvider from '../bot/auth/authProvider';

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
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(AboutCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(AccountAgeCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(CharityCommand);
// SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(collabadd);
// SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(collab);
// SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(collabdisable);
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
// SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(GiveAwayCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(HelpCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(HugCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastDeathCountCommmand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastRaidCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LastSubCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(LurkCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(UnLurkCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(WhoIsLurkingCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(ShoutOutCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(SocialsCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(UpTimeCommand);
SAContainer.bind<ICommandHandler>(InjectionTypes.CommandHandlers).to(WishListCommand);

// Bind dependencies to container
SAContainer
    .bind<winston.Logger>(InjectionTypes.Logger)
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
