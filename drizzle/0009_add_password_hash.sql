-- Add passwordHash column for email/password authentication
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
