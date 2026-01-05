-- Create profiles table
-- This table stores user metadata and is linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  display_name TEXT
);

-- Create index on id (primary key already creates this, but being explicit)
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- Create index on last_active_at for potential queries
CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx ON profiles(last_active_at);

