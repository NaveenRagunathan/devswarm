#!/bin/bash

# DevSwarm Database Migration Script
# This script runs all database migrations in order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 DevSwarm Database Migration Script"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f "../backend/.env" ]; then
    echo -e "${RED}Error: backend/.env file not found${NC}"
    echo "Please create backend/.env with your Tiger Cloud credentials"
    exit 1
fi

# Load environment variables
export $(cat ../backend/.env | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$TIGER_HOST" ] || [ -z "$TIGER_USER" ] || [ -z "$TIGER_PASSWORD" ] || [ -z "$TIGER_DATABASE" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Required: TIGER_HOST, TIGER_USER, TIGER_PASSWORD, TIGER_DATABASE"
    exit 1
fi

# Build connection string
TIGER_PORT=${TIGER_PORT:-5432}
TIGER_SSL=${TIGER_SSL:-true}

if [ "$TIGER_SSL" = "true" ]; then
    SSL_MODE="?sslmode=require"
else
    SSL_MODE=""
fi

CONNECTION_STRING="postgresql://${TIGER_USER}:${TIGER_PASSWORD}@${TIGER_HOST}:${TIGER_PORT}/${TIGER_DATABASE}${SSL_MODE}"

echo -e "${YELLOW}Connecting to:${NC} ${TIGER_HOST}:${TIGER_PORT}"
echo ""

# Function to run a migration
run_migration() {
    local file=$1
    local name=$(basename "$file")
    
    echo -e "${YELLOW}Running migration:${NC} $name"
    
    if psql "$CONNECTION_STRING" -f "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ $name failed${NC}"
        return 1
    fi
}

# Run migrations in order
echo "📦 Running migrations..."
echo ""

MIGRATIONS_DIR="./migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: migrations directory not found${NC}"
    exit 1
fi

# Run each migration
for migration in "$MIGRATIONS_DIR"/00*.sql; do
    if [ -f "$migration" ]; then
        if ! run_migration "$migration"; then
            echo ""
            echo -e "${RED}Migration failed. Stopping.${NC}"
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}✅ All migrations completed successfully!${NC}"
echo ""

# Verify data
echo "🔍 Verifying database setup..."
echo ""

# Check agents
AGENT_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM agents;" 2>/dev/null | tr -d ' ')
echo "Agents found: $AGENT_COUNT"

# Check patterns
PATTERN_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM code_patterns;" 2>/dev/null | tr -d ' ')
echo "Code patterns found: $PATTERN_COUNT"

echo ""
if [ "$AGENT_COUNT" -ge 4 ] && [ "$PATTERN_COUNT" -ge 20 ]; then
    echo -e "${GREEN}✅ Database is ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Expected at least 4 agents and 20 patterns${NC}"
fi

echo ""
echo "🎉 Setup complete! You can now start the backend server."
