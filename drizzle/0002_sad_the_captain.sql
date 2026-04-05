CREATE TABLE `match_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotId` int NOT NULL,
	`toEntrantId` int NOT NULL,
	`fromEntrantId` int NOT NULL,
	`message` text,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entrantId` int NOT NULL,
	`slotDescription` varchar(256) NOT NULL,
	`notes` text,
	`open` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `set_reports` ADD `verified` boolean DEFAULT false NOT NULL;