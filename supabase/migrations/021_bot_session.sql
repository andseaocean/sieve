-- Migration 021: Add bot_session field to candidates table
-- Stores in-progress Telegram bot state (e.g. questionnaire flow)

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bot_session JSONB DEFAULT NULL;
