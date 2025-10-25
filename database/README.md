# Database Setup & Migrations

This directory contains the database schema and migration scripts for DevSwarm.

## Quick Start

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run migrate
```

### Option 2: Using Node.js directly

```bash
cd database
node run-migrations.js
```

### Option 3: Using bash script (Linux/Mac)

```bash
cd database
chmod +x run-migrations.sh
./run-migrations.sh
```

## What Gets Created

The migrations will create:

1. **Tables**:
   - `agents` - AI agents for code analysis (4 agents)
   - `code_submissions` - User code submissions
   - `analysis_results` - Analysis results from agents
   - `code_patterns` - Pattern library for detection (20+ patterns)
   - `agent_forks` - Tiger Cloud fork management

2. **Functions**:
   - `update_updated_at()` - Auto-update timestamp trigger
   - `get_analysis_summary()` - Analysis statistics

3. **Seed Data**:
   - 4 specialized agents (Security, Performance, Accessibility, Best Practices)
   - 20+ code patterns across different categories

## Migration Files

1. **001_initial_schema.sql** - Core tables and extensions
2. **002_functions_and_views.sql** - Helper functions and triggers
3. **003_seed_data.sql** - Initial agents and patterns

## Verification

After running migrations, verify the setup:

```bash
# Check agents
curl http://localhost:3001/api/agents

# Should return 4 agents:
# - Security Sentinel
# - Performance Optimizer
# - Accessibility Guardian
# - Best Practices Enforcer
```

## Troubleshooting

### "Connection refused"
- Verify Tiger Cloud credentials in `backend/.env`
- Check if service is running: `tiger service list`

### "Permission denied"
- Make sure bash script is executable: `chmod +x run-migrations.sh`

### "Module not found"
- Install backend dependencies: `cd backend && npm install`

### "Migrations already applied"
- Migrations use `ON CONFLICT DO NOTHING` so they're safe to re-run
- To reset database, drop tables manually and re-run migrations

## Manual Migration (Advanced)

If you prefer to run migrations manually:

```bash
# Using psql
psql "postgresql://tsdbadmin:PASSWORD@HOST:PORT/tsdb?sslmode=require" \
  -f migrations/001_initial_schema.sql

psql "postgresql://tsdbadmin:PASSWORD@HOST:PORT/tsdb?sslmode=require" \
  -f migrations/002_functions_and_views.sql

psql "postgresql://tsdbadmin:PASSWORD@HOST:PORT/tsdb?sslmode=require" \
  -f migrations/003_seed_data.sql
```

## Adding New Patterns

To add more code patterns, create a new migration file:

```sql
-- migrations/004_add_more_patterns.sql
BEGIN;

INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix, tags) VALUES
    ('your-pattern', 'security', 'high', 'Description', 'javascript', 'Fix suggestion', ARRAY['tag1', 'tag2'])
ON CONFLICT DO NOTHING;

COMMIT;
```

Then run migrations again to apply the new patterns.

## Schema Diagram

```
┌─────────────────┐
│     agents      │
│  (4 agents)     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐      ┌──────────────────┐
│code_submissions │      │  code_patterns   │
│  (user code)    │      │  (20+ patterns)  │
└────────┬────────┘      └──────────────────┘
         │                        │
         │ 1:N                    │
         ▼                        │
┌─────────────────┐               │
│analysis_results │◄──────────────┘
│  (findings)     │    Pattern matches
└─────────────────┘
```

## Next Steps

After running migrations:

1. Start the backend: `cd backend && npm run dev`
2. Test the API: `curl http://localhost:3001/api/agents`
3. Start the frontend: `cd frontend && npm run dev`
4. Analyze some code!
