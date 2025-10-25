// Core domain types for DevSwarm

export interface Agent {
  id: string;
  name: string;
  specialty: 'security' | 'performance' | 'accessibility' | 'best-practices';
  fork_id: string | null;
  status: 'idle' | 'analyzing' | 'error';
  created_at: Date;
  updated_at: Date;
}

export interface CodeSubmission {
  id: string;
  code: string;
  language: string;
  filename?: string;
  submitted_at: Date;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  user_id?: string;
}

export interface AnalysisResult {
  id: string;
  submission_id: string;
  agent_id: string;
  findings: Finding[];
  confidence: number;
  execution_time_ms: number;
  created_at: Date;
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line_start?: number;
  line_end?: number;
  column_start?: number;
  column_end?: number;
  suggestion?: string;
  code_snippet?: string;
  pattern_match_id?: string;
}

export interface CodePattern {
  id: string;
  pattern_text: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  language: string;
  embedding?: number[];
  example_fix?: string;
  created_at: Date;
}

export interface AgentFork {
  fork_id: string;
  agent_id: string;
  parent_service_id: string;
  created_at: Date;
  expires_at: Date;
  status: 'active' | 'expired' | 'deleted';
}

export interface AnalysisRequest {
  code: string;
  language: string;
  filename?: string;
  agents?: Agent['specialty'][];
}

export interface AnalysisResponse {
  submission_id: string;
  status: 'analyzing' | 'completed' | 'failed';
  results: AnalysisResult[];
  summary: {
    total_findings: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
  };
  execution_time_ms: number;
}

export interface MCPConfig {
  service_id: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface TigerConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  close(): Promise<void>;
}

export interface HybridSearchResult {
  pattern: CodePattern;
  similarity_score: number;
  rank: number;
}

// WebSocket message types
export interface WSMessage {
  type: 'analysis_started' | 'agent_progress' | 'analysis_complete' | 'error';
  payload: any;
}

export interface AgentProgress {
  agent_id: string;
  agent_name: string;
  status: 'started' | 'searching' | 'analyzing' | 'completed' | 'failed';
  progress_percent: number;
  current_step?: string;
}

// Error types
export class DevSwarmError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DevSwarmError';
  }
}

export class MCPConnectionError extends DevSwarmError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_CONNECTION_ERROR', 503, details);
    this.name = 'MCPConnectionError';
  }
}

export class AgentExecutionError extends DevSwarmError {
  constructor(message: string, public agentId: string, details?: any) {
    super(message, 'AGENT_EXECUTION_ERROR', 500, details);
    this.name = 'AgentExecutionError';
  }
}

export class ValidationError extends DevSwarmError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}
