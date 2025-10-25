import { Agent, Finding, CodePattern, HybridSearchResult, AgentProgress } from '../types/index.js';
import { TigerConnection } from '../types/index.js';

export abstract class BaseAgent {
  protected agent: Agent;
  protected db: TigerConnection;
  protected progressCallback?: (progress: AgentProgress) => void;

  constructor(agent: Agent, db: TigerConnection, progressCallback?: (progress: AgentProgress) => void) {
    this.agent = agent;
    this.db = db;
    this.progressCallback = progressCallback;
  }

  /**
   * Main analysis method - must be implemented by each agent
   */
  abstract analyze(code: string, language: string): Promise<Finding[]>;

  /**
   * Get relevant patterns for this agent's specialty
   */
  protected async getRelevantPatterns(language: string, limit: number = 10): Promise<CodePattern[]> {
    const query = `
      SELECT id, pattern_text, category, severity, description, language, example_fix, created_at
      FROM code_patterns
      WHERE language = $1 
        AND category LIKE $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    
    const categoryFilter = `%${this.agent.specialty}%`;
    const results = await this.db.query<CodePattern>(query, [language, categoryFilter, limit]);
    return results;
  }

  /**
   * Perform hybrid search using text and semantic similarity
   */
  protected async hybridSearch(
    codeSnippet: string,
    language: string,
    limit: number = 5
  ): Promise<HybridSearchResult[]> {
    // TODO: Implement embedding-based search when pgvector is available
    // For now, use text-based search
    const query = `
      SELECT 
        id, pattern_text, category, severity, description, language, example_fix, created_at,
        1.0 as similarity_score,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rank
      FROM code_patterns
      WHERE language = $1
        AND category LIKE $2
      LIMIT $3
    `;
    
    const categoryFilter = `%${this.agent.specialty}%`;
    const results = await this.db.query<any>(query, [language, categoryFilter, limit]);
    
    return results.map(row => ({
      pattern: {
        id: row.id,
        pattern_text: row.pattern_text,
        category: row.category,
        severity: row.severity,
        description: row.description,
        language: row.language,
        example_fix: row.example_fix,
        created_at: row.created_at,
      },
      similarity_score: row.similarity_score,
      rank: row.rank,
    }));
  }

  /**
   * Update agent progress
   */
  protected updateProgress(status: AgentProgress['status'], percent: number, step?: string) {
    if (this.progressCallback) {
      this.progressCallback({
        agent_id: this.agent.id,
        agent_name: this.agent.name,
        status,
        progress_percent: percent,
        current_step: step,
      });
    }
  }

  /**
   * Extract code snippet around a specific line
   */
  protected extractSnippet(code: string, lineNumber: number, context: number = 2): string {
    const lines = code.split('\n');
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(lines.length, lineNumber + context);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Calculate confidence score based on pattern matches
   */
  protected calculateConfidence(findings: Finding[]): number {
    if (findings.length === 0) return 1.0;
    
    const severityWeights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      info: 0.2,
    };
    
    const avgWeight = findings.reduce((sum, f) => sum + severityWeights[f.severity], 0) / findings.length;
    return Math.min(1.0, avgWeight + 0.2);
  }

  /**
   * Common pattern matching logic
   */
  protected matchPatterns(code: string, patterns: CodePattern[]): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    for (const pattern of patterns) {
      try {
        // Escape special regex characters if pattern is not a valid regex
        let regexPattern = pattern.pattern_text;
        try {
          new RegExp(regexPattern);
        } catch {
          // If invalid regex, escape it and use as literal string
          regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        const regex = new RegExp(regexPattern, 'gi');
        
        lines.forEach((line, index) => {
          const matches = line.matchAll(regex);
          for (const match of matches) {
            findings.push({
              severity: pattern.severity,
              category: pattern.category,
              message: pattern.description,
              line_start: index + 1,
              line_end: index + 1,
              column_start: match.index,
              column_end: match.index ? match.index + match[0].length : undefined,
              suggestion: pattern.example_fix,
              code_snippet: this.extractSnippet(code, index + 1),
              pattern_match_id: pattern.id,
            });
          }
        });
      } catch (error) {
        console.error(`Error matching pattern ${pattern.id}:`, error);
      }
    }

    return findings;
  }
}
