import { config } from 'dotenv';
import { MCPConfig, MCPConnectionError, TigerConnection } from '../types/index.js';
import pkg from 'pg';
const { Pool } = pkg;

config();

export const tigerConfig: MCPConfig = {
  service_id: process.env.TIGER_SERVICE_ID || '',
  host: process.env.TIGER_HOST || '',
  port: parseInt(process.env.TIGER_PORT || '5432', 10),
  database: process.env.TIGER_DATABASE || 'tsdb',
  user: process.env.TIGER_USER || 'tsdbadmin',
  password: process.env.TIGER_PASSWORD || '',
  ssl: process.env.TIGER_SSL === 'true',
};

export const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export const agentConfig = {
  maxParallelAgents: parseInt(process.env.MAX_PARALLEL_AGENTS || '4', 10),
  forkCleanupEnabled: process.env.FORK_CLEANUP_ENABLED === 'true',
  forkTTLHours: parseInt(process.env.FORK_TTL_HOURS || '24', 10),
};

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!tigerConfig.service_id) {
    errors.push('TIGER_SERVICE_ID is required');
  }

  if (!tigerConfig.host) {
    errors.push('TIGER_HOST is required');
  }

  if (!tigerConfig.password) {
    errors.push('TIGER_PASSWORD is required');
  }

  if (!openaiConfig.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (errors.length > 0) {
    throw new MCPConnectionError(
      'Configuration validation failed',
      { errors }
    );
  }
}

export function getConnectionString(): string {
  const { host, port, database, user, password, ssl } = tigerConfig;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${user}:${password}@${host}:${port}/${database}${sslParam}`;
}

export function getMCPServerConfig() {
  return {
    name: process.env.MCP_SERVER_NAME || 'tiger',
    transport: process.env.MCP_TRANSPORT || 'stdio',
    serviceId: tigerConfig.service_id,
  };
}

/**
 * Create a Tiger Cloud database connection
 */
export async function createTigerConnection(): Promise<TigerConnection> {
  const pool = new Pool({
    host: tigerConfig.host,
    port: tigerConfig.port,
    database: tigerConfig.database,
    user: tigerConfig.user,
    password: tigerConfig.password,
    ssl: tigerConfig.ssl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test the connection
  try {
    const client = await pool.connect();
    client.release();
  } catch (error) {
    throw new MCPConnectionError('Failed to connect to Tiger Cloud database', error);
  }

  return {
    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const result = await pool.query(sql, params);
      return result.rows as T[];
    },
    async execute(sql: string, params?: any[]): Promise<void> {
      await pool.query(sql, params);
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
