CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`matchId` int,
	`fixtureId` int,
	`status` enum('open','resolved','closed') NOT NULL DEFAULT 'open',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
