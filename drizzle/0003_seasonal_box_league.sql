-- Drop old tables (they are empty, this is a full schema replacement)
DROP TABLE IF EXISTS `set_reports`;
DROP TABLE IF EXISTS `match_requests`;
DROP TABLE IF EXISTS `partner_slots`;
DROP TABLE IF EXISTS `entrants`;

-- Seasons
CREATE TABLE IF NOT EXISTS `seasons` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(64) NOT NULL,
  `year` int NOT NULL,
  `quarter` enum('spring','summer','autumn','winter') NOT NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `registrationDeadline` timestamp NOT NULL,
  `status` enum('upcoming','registration','active','completed') NOT NULL DEFAULT 'upcoming',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Season Entrants (individual entry per season)
CREATE TABLE IF NOT EXISTS `season_entrants` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `seasonId` int NOT NULL,
  `userId` int NOT NULL,
  `displayName` varchar(128) NOT NULL,
  `abilityRating` int NOT NULL DEFAULT 3,
  `stripePaymentIntentId` varchar(128),
  `paid` boolean NOT NULL DEFAULT false,
  `seasonPoints` int NOT NULL DEFAULT 0,
  `matchesPlayed` int NOT NULL DEFAULT 0,
  `matchesWon` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Year Points Accumulator
CREATE TABLE IF NOT EXISTS `year_points` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `year` int NOT NULL,
  `totalPoints` int NOT NULL DEFAULT 0,
  `totalMatchesPlayed` int NOT NULL DEFAULT 0,
  `totalMatchesWon` int NOT NULL DEFAULT 0,
  `seasonsEntered` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Boxes
CREATE TABLE IF NOT EXISTS `boxes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `seasonId` int NOT NULL,
  `name` varchar(32) NOT NULL,
  `level` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Box Members
CREATE TABLE IF NOT EXISTS `box_members` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `boxId` int NOT NULL,
  `seasonEntrantId` int NOT NULL,
  `outcome` enum('promoted','stayed','relegated'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Matches (doubles, rotating partners)
CREATE TABLE IF NOT EXISTS `matches` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partner Availability Slots
CREATE TABLE IF NOT EXISTS `partner_slots` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `seasonEntrantId` int NOT NULL,
  `userId` int NOT NULL,
  `slotDescription` varchar(256) NOT NULL,
  `notes` text,
  `open` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Match Requests
CREATE TABLE IF NOT EXISTS `match_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `slotId` int NOT NULL,
  `toUserId` int NOT NULL,
  `fromUserId` int NOT NULL,
  `message` text,
  `status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Spring 2026 season
INSERT INTO `seasons` (`name`, `year`, `quarter`, `startDate`, `endDate`, `registrationDeadline`, `status`)
VALUES ('Spring 2026', 2026, 'spring', '2026-04-01 00:00:00', '2026-06-30 23:59:59', '2026-04-18 23:59:59', 'registration');
