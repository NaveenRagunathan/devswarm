import { AgentFork, TigerConnection } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ForkManager {
  private db: TigerConnection;
  private parentServiceId: string;

  constructor(db: TigerConnection, parentServiceId: string) {
    this.db = db;
    this.parentServiceId = parentServiceId;
  }

  /**
   * Create a new fork for an agent
   * In a real implementation, this would create an actual database fork
   * For now, we'll track fork metadata
   */
  async createFork(agentId: string, durationHours: number = 24): Promise<AgentFork> {
    const forkId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const query = `
      INSERT INTO agent_forks (fork_id, agent_id, parent_service_id, expires_at, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING fork_id, agent_id, parent_service_id, created_at, expires_at, status
    `;

    const results = await this.db.query<AgentFork>(query, [
      forkId,
      agentId,
      this.parentServiceId,
      expiresAt,
    ]);

    return results[0];
  }

  /**
   * Get fork information
   */
  async getFork(forkId: string): Promise<AgentFork | null> {
    const query = `
      SELECT fork_id, agent_id, parent_service_id, created_at, expires_at, status
      FROM agent_forks
      WHERE fork_id = $1
    `;

    const results = await this.db.query<AgentFork>(query, [forkId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all forks for an agent
   */
  async getAgentForks(agentId: string): Promise<AgentFork[]> {
    const query = `
      SELECT fork_id, agent_id, parent_service_id, created_at, expires_at, status
      FROM agent_forks
      WHERE agent_id = $1
      ORDER BY created_at DESC
    `;

    return await this.db.query<AgentFork>(query, [agentId]);
  }

  /**
   * Delete a fork
   */
  async deleteFork(forkId: string): Promise<void> {
    const query = `
      UPDATE agent_forks
      SET status = 'deleted'
      WHERE fork_id = $1
    `;

    await this.db.execute(query, [forkId]);
  }

  /**
   * Clean up expired forks
   */
  async cleanupExpiredForks(): Promise<number> {
    const query = `
      UPDATE agent_forks
      SET status = 'expired'
      WHERE expires_at < NOW()
        AND status = 'active'
      RETURNING fork_id
    `;

    const results = await this.db.query(query);
    return results.length;
  }

  /**
   * Get active forks count
   */
  async getActiveForkCount(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM agent_forks
      WHERE status = 'active'
        AND expires_at > NOW()
    `;

    const results = await this.db.query<{ count: string }>(query);
    return parseInt(results[0].count, 10);
  }

  /**
   * Extend fork expiration
   */
  async extendFork(forkId: string, additionalHours: number): Promise<AgentFork> {
    const query = `
      UPDATE agent_forks
      SET expires_at = expires_at + INTERVAL '${additionalHours} hours'
      WHERE fork_id = $1
      RETURNING fork_id, agent_id, parent_service_id, created_at, expires_at, status
    `;

    const results = await this.db.query<AgentFork>(query, [forkId]);
    if (results.length === 0) {
      throw new Error(`Fork ${forkId} not found`);
    }

    return results[0];
  }
}
