-- Migration: Add division column to year_points table
-- Existing rows default to 'mens' (the only division that existed before Ladies was added)
ALTER TABLE year_points ADD COLUMN division ENUM('mens','ladies') NOT NULL DEFAULT 'mens';
