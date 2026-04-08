-- Migration: Add division column to seasons table
-- Adds mens/ladies division support. Existing seasons default to 'mens'.
ALTER TABLE seasons ADD COLUMN division ENUM('mens','ladies') NOT NULL DEFAULT 'mens';
