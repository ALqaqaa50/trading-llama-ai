CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`apiKey` text NOT NULL,
	`secretKey` text NOT NULL,
	`passphrase` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsed` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtest_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`strategyName` varchar(64) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`initialCapital` varchar(32) NOT NULL,
	`finalCapital` varchar(32) NOT NULL,
	`totalReturn` varchar(16) NOT NULL,
	`sharpeRatio` varchar(16),
	`maxDrawdown` varchar(16),
	`winRate` varchar(16),
	`totalTrades` int NOT NULL,
	`winningTrades` int NOT NULL,
	`losingTrades` int NOT NULL,
	`avgWin` varchar(32),
	`avgLoss` varchar(32),
	`profitFactor` varchar(16),
	`parameters` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backtest_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `indicator_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`indicatorName` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`value` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `indicator_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`open` varchar(32) NOT NULL,
	`high` varchar(32) NOT NULL,
	`low` varchar(32) NOT NULL,
	`close` varchar(32) NOT NULL,
	`volume` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`signalId` int,
	`exchange` varchar(32) NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`entryPrice` varchar(32) NOT NULL,
	`exitPrice` varchar(32),
	`quantity` varchar(32) NOT NULL,
	`pnl` varchar(32),
	`pnlPercentage` varchar(16),
	`fees` varchar(32),
	`status` enum('open','closed','cancelled') NOT NULL DEFAULT 'open',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`notes` text,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`signalType` enum('buy','sell','hold') NOT NULL,
	`strategy` varchar(64) NOT NULL,
	`confidence` int NOT NULL,
	`entryPrice` varchar(32),
	`stopLoss` varchar(32),
	`takeProfit` varchar(32),
	`reasoning` text,
	`status` enum('pending','executed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trading_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `api_keys` (`userId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `backtest_results` (`userId`);--> statement-breakpoint
CREATE INDEX `strategy_idx` ON `backtest_results` (`strategyName`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `chat_messages` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_timeframe_indicator_idx` ON `indicator_cache` (`symbol`,`timeframe`,`indicatorName`,`timestamp`);--> statement-breakpoint
CREATE INDEX `symbol_timeframe_idx` ON `market_data` (`symbol`,`timeframe`,`timestamp`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `trades` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `trades` (`symbol`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `trading_signals` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_idx` ON `trading_signals` (`symbol`);