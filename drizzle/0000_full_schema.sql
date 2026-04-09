-- Full schema creation for fresh database deployments.
-- This single file creates the complete current schema from scratch.
-- All incremental migration files (0000_* through 0009_*) are superseded by this file
-- for new deployments. The migration runner applies this first (alphabetically),
-- then the incremental files are skipped because their changes are already included.

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `passwordHash` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Seasons
CREATE TABLE IF NOT EXISTS `seasons` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(64) NOT NULL,
  `year` int NOT NULL,
  `quarter` enum('spring','summer','autumn','winter') NOT NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `registrationDeadline` timestamp NOT NULL,
  `status` enum('upcoming','registration','active','completed') NOT NULL DEFAULT 'upcoming',
  `division` enum('mens','ladies') NOT NULL DEFAULT 'mens',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);

-- Season Entrants
CREATE TABLE IF NOT EXISTS `season_entrants` (
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
  `phoneNumber` varchar(32),
  `shareContact` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `season_entrants_id` PRIMARY KEY(`id`)
);

-- Year Points Accumulator
CREATE TABLE IF NOT EXISTS `year_points` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `year` int NOT NULL,
  `totalPoints` int NOT NULL DEFAULT 0,
  `totalMatchesPlayed` int NOT NULL DEFAULT 0,
  `totalMatchesWon` int NOT NULL DEFAULT 0,
  `seasonsEntered` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `year_points_id` PRIMARY KEY(`id`)
);

-- Boxes
CREATE TABLE IF NOT EXISTS `boxes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `seasonId` int NOT NULL,
  `name` varchar(32) NOT NULL,
  `level` int NOT NULL,
  `whatsappLink` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `boxes_id` PRIMARY KEY(`id`)
);

-- Box Members
CREATE TABLE IF NOT EXISTS `box_members` (
  `id` int AUTO_INCREMENT NOT NULL,
  `boxId` int NOT NULL,
  `seasonEntrantId` int NOT NULL,
  `outcome` enum('promoted','stayed','relegated'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `box_members_id` PRIMARY KEY(`id`)
);

-- Matches
CREATE TABLE IF NOT EXISTS `matches` (
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);

-- Fixtures (round-robin schedule)
CREATE TABLE IF NOT EXISTS `fixtures` (
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
  `isBalancer` boolean NOT NULL DEFAULT false,
  `balancerEligiblePlayers` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fixtures_id` PRIMARY KEY(`id`)
);

-- Disputes
CREATE TABLE IF NOT EXISTS `disputes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `subject` varchar(256) NOT NULL,
  `description` text NOT NULL,
  `matchId` int,
  `fixtureId` int,
  `status` enum('open','resolved','closed') NOT NULL DEFAULT 'open',
  `adminNotes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);

-- Partner Slots
CREATE TABLE IF NOT EXISTS `partner_slots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `seasonEntrantId` int NOT NULL,
  `userId` int NOT NULL,
  `slotDescription` varchar(256) NOT NULL,
  `notes` text,
  `open` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `partner_slots_id` PRIMARY KEY(`id`)
);

-- Match Requests
CREATE TABLE IF NOT EXISTS `match_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slotId` int NOT NULL,
  `toUserId` int NOT NULL,
  `fromUserId` int NOT NULL,
  `message` text,
  `status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `match_requests_id` PRIMARY KEY(`id`)
);
