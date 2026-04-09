-- Migration: Add whatsappLink column to boxes table
ALTER TABLE boxes ADD COLUMN whatsappLink VARCHAR(512);
