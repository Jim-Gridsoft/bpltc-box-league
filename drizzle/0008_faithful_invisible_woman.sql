ALTER TABLE `season_entrants` ADD `phoneNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `season_entrants` ADD `shareContact` boolean DEFAULT false NOT NULL;