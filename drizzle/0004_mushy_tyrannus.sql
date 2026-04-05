CREATE TABLE `box_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`seasonEntrantId` int NOT NULL,
	`outcome` enum('promoted','stayed','relegated'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `box_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`name` varchar(32) NOT NULL,
	`level` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`seasonId` int NOT NULL,
	`round` int NOT NULL,
	`teamAPlayer1` int NOT NULL,
	`teamAPlayer2` int NOT NULL,
	`teamBPlayer1` int NOT NULL,
	`teamBPlayer2` int NOT NULL,
	`matchId` int,
	`status` enum('scheduled','played','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixtures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boxId` int NOT NULL,
	`seasonId` int NOT NULL,
	`player1Id` int NOT NULL,
	`partner1Id` int NOT NULL,
	`player2Id` int NOT NULL,
	`partner2Id` int NOT NULL,
	`score` varchar(64) NOT NULL,
	`winner` enum('A','B') NOT NULL,
	`playedAt` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `season_entrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`abilityRating` int NOT NULL DEFAULT 3,
	`stripePaymentIntentId` varchar(128),
	`paid` boolean NOT NULL DEFAULT false,
	`seasonPoints` int NOT NULL DEFAULT 0,
	`matchesPlayed` int NOT NULL DEFAULT 0,
	`matchesWon` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `season_entrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`quarter` enum('spring','summer','autumn','winter') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`registrationDeadline` timestamp NOT NULL,
	`status` enum('upcoming','registration','active','completed') NOT NULL DEFAULT 'upcoming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `year_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`totalMatchesPlayed` int NOT NULL DEFAULT 0,
	`totalMatchesWon` int NOT NULL DEFAULT 0,
	`seasonsEntered` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `year_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `entrants`;--> statement-breakpoint
DROP TABLE `set_reports`;--> statement-breakpoint
ALTER TABLE `match_requests` ADD `toUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `match_requests` ADD `fromUserId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `partner_slots` ADD `seasonEntrantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `partner_slots` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `match_requests` DROP COLUMN `toEntrantId`;--> statement-breakpoint
ALTER TABLE `match_requests` DROP COLUMN `fromEntrantId`;--> statement-breakpoint
ALTER TABLE `partner_slots` DROP COLUMN `entrantId`;