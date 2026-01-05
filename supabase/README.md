# Supabase Database Migrations

This directory contains SQL migration files for the Goals feature.

## Setup Instructions

1. Create a Supabase project at https://supabase.com/dashboard
2. Copy your project URL and anon key
3. Create a `.env.local` file in the project root with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Running Migrations

### Option 1: Using Supabase Dashboard SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001, 002, 003, etc.)

### Option 2: Using Supabase CLI
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Migration Files

- `001_create_profiles.sql` - User profiles table
- `002_create_goals.sql` - Goals definitions table
- `003_create_daily_goal_status.sql` - Daily goal completion status
- `004_create_weekly_goal_status.sql` - Weekly goal completion status
- `005_enable_rls_profiles.sql` - RLS policies for profiles
- `006_enable_rls_goals.sql` - RLS policies for goals
- `007_enable_rls_daily_goal_status.sql` - RLS policies for daily status
- `008_enable_rls_weekly_goal_status.sql` - RLS policies for weekly status

## Schema Overview

### profiles
- User metadata and migration status
- Linked to Supabase Auth users

### goals
- Core goal definitions
- Supports daily/weekly types, multi-step goals, and day-of-week scheduling

### daily_goal_status
- Per-goal, per-day completion tracking
- Includes step completions and snooze status

### weekly_goal_status
- Per-goal, per-week completion tracking
- Includes daily increments for over-completion tracking

