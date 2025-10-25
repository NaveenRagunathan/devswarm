import { Agent, AgentProgress, TigerConnection } from '../types/index.js';
import { BaseAgent } from './BaseAgent.js';
import { SecurityAgent } from './SecurityAgent.js';
import { PerformanceAgent } from './PerformanceAgent.js';
import { AccessibilityAgent } from './AccessibilityAgent.js';
import { BestPracticesAgent } from './BestPracticesAgent.js';

export class AgentFactory {
  static createAgent(
    agent: Agent,
    db: TigerConnection,
    progressCallback?: (progress: AgentProgress) => void
  ): BaseAgent {
    switch (agent.specialty) {
      case 'security':
        return new SecurityAgent(agent, db, progressCallback);
      case 'performance':
        return new PerformanceAgent(agent, db, progressCallback);
      case 'accessibility':
        return new AccessibilityAgent(agent, db, progressCallback);
      case 'best-practices':
        return new BestPracticesAgent(agent, db, progressCallback);
      default:
        throw new Error(`Unknown agent specialty: ${agent.specialty}`);
    }
  }

  static async getAvailableAgents(db: TigerConnection): Promise<Agent[]> {
    const query = `
      SELECT id, name, specialty, fork_id, status, created_at, updated_at
      FROM agents
      WHERE status != 'error'
      ORDER BY specialty
    `;
    
    return await db.query<Agent>(query);
  }

  static async getAgentById(db: TigerConnection, agentId: string): Promise<Agent | null> {
    const query = `
      SELECT id, name, specialty, fork_id, status, created_at, updated_at
      FROM agents
      WHERE id = $1
    `;
    
    const results = await db.query<Agent>(query, [agentId]);
    return results.length > 0 ? results[0] : null;
  }

  static async updateAgentStatus(
    db: TigerConnection,
    agentId: string,
    status: Agent['status']
  ): Promise<void> {
    const query = `
      UPDATE agents
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await db.execute(query, [status, agentId]);
  }
}
