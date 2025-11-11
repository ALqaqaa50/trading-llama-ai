CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`riskPercentage` varchar(10) NOT NULL DEFAULT '2',
	`maxDailyLoss` varchar(50),
	`maxOpenTrades` int NOT NULL DEFAULT 3,
	`defaultLeverage` int NOT NULL DEFAULT 1,
	`autoCloseEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
