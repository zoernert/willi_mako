-- Migration: Add M2C Roles Support
-- Date: 2025-08-10
-- Description: Creates m2c_roles table and extends users table for role selection

-- Neue Tabelle für M2C-Rollen
CREATE TABLE m2c_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index für Performance
CREATE INDEX idx_m2c_roles_role_name ON m2c_roles(role_name);

-- Erweiterung der Users-Tabelle
ALTER TABLE users ADD COLUMN selected_m2c_role_ids UUID[] DEFAULT '{}';

-- Index für User-Rollen
CREATE INDEX idx_users_m2c_roles ON users USING GIN(selected_m2c_role_ids);

-- Kommentar für Dokumentation
COMMENT ON TABLE m2c_roles IS 'Meter-to-Cash role definitions for user context enhancement';
COMMENT ON COLUMN users.selected_m2c_role_ids IS 'Array of selected M2C role IDs for user context';
