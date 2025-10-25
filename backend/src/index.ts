import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

declare module 'express' {
  interface Request {
    ws?: () => Promise<WebSocket>;
  }
}

type WebSocketType = WebSocket;
import { createServer } from 'http';
import { serverConfig, validateConfig, createTigerConnection } from './config/tiger.js';
import { DevSwarmError, AnalysisRequest, AnalysisResponse, AgentProgress, WSMessage, TigerConnection } from './types/index.js';
import { AgentFactory } from './agents/index.js';
import { v4 as uuidv4 } from 'uuid';
import executeRouter from './routes/execute.js';

// Validate configuration on startup
try {
  validateConfig();
  console.log('✓ Configuration validated successfully');
} catch (error) {
  console.error('✗ Configuration validation failed:', error);
  process.exit(1);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store active WebSocket connections by submission ID
const wsConnections = new Map<string, Set<WebSocketType>>();

// Database connection
let db: TigerConnection | null = null;

// Initialize database connection
async function initDatabase() {
  try {
    db = await createTigerConnection();
    console.log('✓ Database connection established');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
}

initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: serverConfig.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'devswarm-backend',
    version: '1.0.0',
  });
});

// Mount execute router
app.use('/api/execute', executeRouter);

// API Routes
app.get('/api/agents', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!db) {
      throw new DevSwarmError('Database not initialized', 'DB_NOT_READY', 503);
    }

    const agents = await AgentFactory.getAvailableAgents(db);
    return res.json({ agents });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, language, filename, agents: requestedAgents }: AnalysisRequest = req.body;

    if (!code || !language) {
      return res.status(400).json({
        error: 'Missing required fields: code and language',
        code: 'MISSING_FIELDS',
      });
    }

    if (!db) {
      throw new DevSwarmError('Database not initialized', 'DB_NOT_READY', 503);
    }

    const submissionId = uuidv4();

    // Create code submission record
    await db.execute(
      `INSERT INTO code_submissions (id, code, language, filename, status)
       VALUES ($1, $2, $3, $4, 'analyzing')`,
      [submissionId, code, language, filename || null]
    );

    // Start analysis in background
    analyzeCode(submissionId, code, language, requestedAgents).catch(error => {
      console.error('Analysis error:', error);
      broadcastToSubmission(submissionId, {
        type: 'error',
        payload: { 
          message: 'Analysis failed', 
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    });

    return res.status(202).json({
      submissionId,
      status: 'accepted',
      message: 'Analysis started. Connect to WebSocket for real-time updates.',
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/analysis/:submissionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;

    if (!db) {
      throw new DevSwarmError('Database not initialized', 'DB_NOT_READY', 503);
    }

    // Get submission status
    const submissions = await db.query(
      'SELECT id, status, submitted_at FROM code_submissions WHERE id = $1',
      [submissionId]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ 
        error: 'Submission not found',
        code: 'SUBMISSION_NOT_FOUND',

    // Calculate summary
    const summary = {
      total_findings: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      info_count: 0,
    };

    results.forEach((result: any) => {
      result.findings.forEach((finding: any) => {
        summary.total_findings++;
        const key = `${finding.severity}_count` as keyof typeof summary;
        if (key in summary) {
          summary[key]++;
        }
      });
    });

    const response: AnalysisResponse = {
      submission_id: submissionId,
      status: submissions[0].status,
      results,
      summary,
      execution_time_ms: results.reduce((sum: number, r: any) => sum + r.execution_time_ms, 0),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.get('/api/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, language, limit = 10 } = req.query;

    if (!db) {
      throw new DevSwarmError('Database not initialized', 'DB_NOT_READY', 503);
    }

    let sqlQuery = 'SELECT * FROM code_patterns WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (language) {
      sqlQuery += ` AND language = $${paramIndex++}`;
      params.push(language);
    }

    if (query) {
      sqlQuery += ` AND (pattern_text ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${query}%`);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const patterns = await db.query(sqlQuery, params);

    res.json({
      patterns,
      total: patterns.length,
    });
  } catch (error) {
    next(error);
  }
});

// Chat with agent endpoint
app.post('/api/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId, message } = req.body;

    if (!agentId || message === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: agentId and message',
        code: 'MISSING_FIELDS',
      });
    }

    if (!db) {
      throw new DevSwarmError('Database not initialized', 'DB_NOT_READY', 503);
    }

    // Get agent from database
    const agents = await db.query('SELECT * FROM agents WHERE id = $1', [agentId]);
    if (agents.length === 0) {
      return res.status(404).json({
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND',
      });
    }

    // TODO: Implement chat functionality
    return res.status(501).json({
      error: 'Chat functionality not yet implemented',
      code: 'NOT_IMPLEMENTED',
    });
  } catch (error) {
    return next(error);
  }
});

// Explain code endpoint
app.post('/api/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Missing required field: code',
        code: 'MISSING_CODE',
      });
    }

    // Import explain function
    const { explainCode } = await import('./services/llmService.js');
    const explanation = await explainCode(code, language || 'plaintext');

    return res.json({
      explanation,
      language: language || 'plaintext',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

// LLM status endpoint
app.get('/api/llm/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { isLLMConfigured, getLLMProvider } = await import('./services/llmService.js');
    
    return res.json({
      configured: isLLMConfigured(),
      provider: getLLMProvider(),
      features: {
        analysis: isLLMConfigured(),
        chat: isLLMConfigured(),
        explanation: isLLMConfigured(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
    next(error);
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  let subscribedSubmissionId: string | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data);

      if (data.type === 'subscribe' && data.submission_id) {
        const subId = data.submission_id as string;
        subscribedSubmissionId = subId;
        
        if (!wsConnections.has(subId)) {
          wsConnections.set(subId, new Set());
        }
        const connections = wsConnections.get(subId);
        if (connections) {
          connections.add(ws);
        }
        
        ws.send(JSON.stringify({
          type: 'subscribed',
          submission_id: subId,
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (subscribedSubmissionId) {
      const connections = wsConnections.get(subscribedSubmissionId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          wsConnections.delete(subscribedSubmissionId);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to DevSwarm analysis server',
  }));
});

// Broadcast message to all clients subscribed to a submission
function broadcastToSubmission(submissionId: string, message: WSMessage) {
  const connections = wsConnections.get(submissionId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

// Main analysis orchestration function
async function analyzeCode(
  submissionId: string,
  code: string,
  language: string,
  requestedAgents?: string[]
) {
  if (!db) throw new Error('Database not initialized');

  const startTime = Date.now();

  try {
    // Broadcast analysis started
    broadcastToSubmission(submissionId, {
      type: 'analysis_started',
      payload: { submission_id: submissionId },
    });

    // Get agents to run
    const allAgents = await AgentFactory.getAvailableAgents(db);
    const agentsToRun = requestedAgents
      ? allAgents.filter(a => requestedAgents.includes(a.specialty))
      : allAgents;

    // Run agents in parallel
    const analysisPromises = agentsToRun.map(async (agent) => {
      const agentStartTime = Date.now();

      try {
        // Update agent status
        await AgentFactory.updateAgentStatus(db!, agent.id, 'analyzing');

        // Create agent instance with progress callback
        const agentInstance = AgentFactory.createAgent(
          agent,
          db!,
          (progress: AgentProgress) => {
            broadcastToSubmission(submissionId, {
              type: 'agent_progress',
              payload: progress,
            });
          }
        );

        // Run analysis
        const findings = await agentInstance.analyze(code, language);
        const executionTime = Date.now() - agentStartTime;

        // Calculate confidence
        const confidence = findings.length > 0 ? 0.85 : 1.0;

        // Store results
        await db!.execute(
          `INSERT INTO analysis_results (id, submission_id, agent_id, findings, confidence, execution_time_ms)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), submissionId, agent.id, JSON.stringify(findings), confidence, executionTime]
        );

        // Update agent status
        await AgentFactory.updateAgentStatus(db!, agent.id, 'idle');

        return { agent, findings, executionTime };
      } catch (error) {
        console.error(`Agent ${agent.name} failed:`, error);
        await AgentFactory.updateAgentStatus(db!, agent.id, 'error');
        throw error;
      }
    });

    await Promise.all(analysisPromises);

    // Update submission status
    await db.execute(
      'UPDATE code_submissions SET status = $1 WHERE id = $2',
      ['completed', submissionId]
    );

    const totalTime = Date.now() - startTime;

    // Broadcast completion
    broadcastToSubmission(submissionId, {
      type: 'analysis_complete',
      payload: {
        submission_id: submissionId,
        execution_time_ms: totalTime,
      },
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    await db.execute(
      'UPDATE code_submissions SET status = $1 WHERE id = $2',
      ['failed', submissionId]
    );
    throw error;
  }
}

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  
  // Handle DevSwarmError
  if (err instanceof DevSwarmError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Handle other errors
  const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
  const response: {
    error: string;
    code: string;
    details?: unknown;
  } = {
    error: errorMessage,
    code: 'INTERNAL_SERVER_ERROR',
  };

  // Add stack trace in development
  if (serverConfig.nodeEnv === 'development' && err instanceof Error) {
    response.details = {
      stack: err.stack,
      name: err.name,
    };
  }

  return res.status(500).json(response);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
server.listen(serverConfig.port, () => {
  console.log('');
  console.log('🚀 DevSwarm Backend Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 HTTP Server: http://localhost:${serverConfig.port}`);
  console.log(`🔌 WebSocket: ws://localhost:${serverConfig.port}`);
  console.log(`🌍 Environment: ${serverConfig.nodeEnv}`);
  console.log(`🔗 CORS Origin: ${serverConfig.corsOrigin}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/agents');
  console.log('  POST /api/analyze');
  console.log('  GET  /api/analysis/:submissionId');
  console.log('  GET  /api/patterns');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
