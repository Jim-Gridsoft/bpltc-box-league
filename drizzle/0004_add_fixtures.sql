-- Migration: Add fixtures table for round-robin schedule generation
-- Each fixture is a planned doubles match between two pairs within a box.

CREATE TABLE IF NOT EXISTS `fixtures` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `boxId` int NOT NULL,
  `seasonId` int NOT NULL,
  `round` int NOT NULL,
  `teamAPlayer1` int NOT NULL,
  `teamAPlayer2` int NOT NULL,
  `teamBPlayer1` int NOT NULL,
  `teamBPlayer2` int NOT NULL,
  `matchId` int,
  `status` enum('scheduled','played','cancelled') NOT NULL DEFAULT 'scheduled',
  `createdAt` timestamp NOT NULL DEFAULT (now())
);
