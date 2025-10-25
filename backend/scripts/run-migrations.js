#!/usr/bin/env node

/**
 * DevSwarm Database Migration Script
 * Runs all database migrations in order
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('🚀 DevSwarm Database Migration Script', 'blue');
  log('======================================', 'blue');
  console.log('');

  // Load environment variables from backend/.env
  const envPath = join(__dirname, '../.env');
  try {
    dotenv.config({ path: envPath });
  } catch (error) {
    log('Error: Could not load .env file', 'red');
    log('Please create backend/.env with your Tiger Cloud credentials', 'red');
    process.exit(1);
  }

  // Validate required environment variables
  const required = ['TIGER_HOST', 'TIGER_USER', 'TIGER_PASSWORD', 'TIGER_DATABASE'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    log('Error: Missing required environment variables:', 'red');
    missing.forEach(key => log(`  - ${key}`, 'red'));
    process.exit(1);
  }

  // Build connection config
  const config = {
    host: process.env.TIGER_HOST,
    port: parseInt(process.env.TIGER_PORT || '5432'),
    database: process.env.TIGER_DATABASE,
    user: process.env.TIGER_USER,
    password: process.env.TIGER_PASSWORD,
    ssl: process.env.TIGER_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  log(`Connecting to: ${config.host}:${config.port}`, 'yellow');
  console.log('');

  // Create database client
  const client = new Client(config);

  try {
    await client.connect();
    log('✓ Connected to database', 'green');
    console.log('');

    // Get migration files
    const migrationsDir = join(__dirname, '../../database/migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f.match(/^\d{3}_/))
      .sort();

    if (files.length === 0) {
      log('No migration files found', 'yellow');
      process.exit(0);
    }

    log('📦 Running migrations...', 'blue');
    console.log('');

    // Run each migration
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      log(`Running migration: ${file}`, 'yellow');

      try {
        const sql = readFileSync(filePath, 'utf8');
        await client.query(sql);
        log(`✓ ${file} completed successfully`, 'green');
      } catch (error) {
        log(`✗ ${file} failed`, 'red');
        log(`Error: ${error.message}`, 'red');
        process.exit(1);
      }
    }

    console.log('');
    log('✅ All migrations completed successfully!', 'green');
    console.log('');

    // Verify data
    log('🔍 Verifying database setup...', 'blue');
    console.log('');

    const agentResult = await client.query('SELECT COUNT(*) FROM agents');
    const agentCount = parseInt(agentResult.rows[0].count);
    log(`Agents found: ${agentCount}`, 'blue');

    const patternResult = await client.query('SELECT COUNT(*) FROM code_patterns');
    const patternCount = parseInt(patternResult.rows[0].count);
    log(`Code patterns found: ${patternCount}`, 'blue');

    console.log('');
    if (agentCount >= 4 && patternCount >= 20) {
      log('✅ Database is ready!', 'green');
    } else {
      log('⚠️  Warning: Expected at least 4 agents and 20 patterns', 'yellow');
    }

    console.log('');
    log('🎉 Setup complete! You can now start the backend server.', 'green');

  } catch (error) {
    log('Error:', 'red');
    log(error.message, 'red');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
