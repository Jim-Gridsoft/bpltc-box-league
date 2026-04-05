CREATE TABLE `entrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`paid` boolean NOT NULL DEFAULT false,
	`setsWon` int NOT NULL DEFAULT 0,
	`setsPlayed` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `set_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entrantId` int NOT NULL,
	`opponent` varchar(256) NOT NULL,
	`score` varchar(32) NOT NULL,
	`won` boolean NOT NULL,
	`playedOn` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `set_reports_id` PRIMARY KEY(`id`)
);
