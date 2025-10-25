# Database Migrations

This directory contains SQL migration files for the DevSwarm database schema.

## Migration Files

1. **001_initial_schema.sql** - Creates core tables
2. **002_functions_and_views.sql** - Adds helper functions and views
3. **003_seed_data.sql** - Populates initial data

## Running Migrations

```bash
psql -h <host> -U tsdbadmin -d tsdb -f migrations/001_initial_schema.sql
psql -h <host> -U tsdbadmin -d tsdb -f migrations/002_functions_and_views.sql
psql -h <host> -U tsdbadmin -d tsdb -f migrations/003_seed_data.sql
```
