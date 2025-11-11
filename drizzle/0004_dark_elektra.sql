CREATE TABLE `telegram_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chatId` varchar(255),
	`enabled` int NOT NULL DEFAULT 1,
	`notifyOnTradeOpen` int NOT NULL DEFAULT 1,
	`notifyOnTradeClose` int NOT NULL DEFAULT 1,
	`notifyOnStopLoss` int NOT NULL DEFAULT 1,
	`notifyOnTakeProfit` int NOT NULL DEFAULT 1,
	`notifyOnDailyLossLimit` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_settings_userId_unique` UNIQUE(`userId`)
);
