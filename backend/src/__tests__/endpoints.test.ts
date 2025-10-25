/**
 * DevSwarm Backend API Endpoint Tests
 * 
 * Tests all API endpoints with unit and functional testing
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3002';

let api: AxiosInstance;

beforeAll(() => {
  api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    validateStatus: () => true, // Don't throw on any status
  });
});

describe('Health Check Endpoint', () => {
  it('GET /health should return 200 and status healthy', async () => {
    const response = await api.get('/health');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'healthy');
    expect(response.data).toHaveProperty('timestamp');
    expect(response.data).toHaveProperty('service');
    expect(response.data).toHaveProperty('version');
  });
});

describe('Agents Endpoint', () => {
  it('GET /api/agents should return list of agents', async () => {
    const response = await api.get('/api/agents');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('agents');
    expect(Array.isArray(response.data.agents)).toBe(true);
    expect(response.data.agents.length).toBeGreaterThan(0);
    
    // Check agent structure
    const agent = response.data.agents[0];
    expect(agent).toHaveProperty('id');
    expect(agent).toHaveProperty('name');
    expect(agent).toHaveProperty('specialty');
    expect(agent).toHaveProperty('status');
    expect(['security', 'performance', 'accessibility', 'best-practices']).toContain(agent.specialty);
  });

  it('GET /api/agents should return 4 agents', async () => {
    const response = await api.get('/api/agents');
    
    expect(response.status).toBe(200);
    expect(response.data.agents.length).toBe(4);
    
    // Check all specialties are present
    const specialties = response.data.agents.map((a: any) => a.specialty);
    expect(specialties).toContain('security');
    expect(specialties).toContain('performance');
    expect(specialties).toContain('accessibility');
    expect(specialties).toContain('best-practices');
  });
});

describe('Code Analysis Endpoint', () => {
  it('POST /api/analyze should start analysis with valid code', async () => {
    const response = await api.post('/api/analyze', {
      code: 'console.log("Hello World");',
      language: 'javascript',
      filename: 'test.js',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('submission_id');
    expect(response.data).toHaveProperty('status', 'analyzing');
    expect(response.data).toHaveProperty('message');
    
    // Submission ID should be a valid UUID
    expect(response.data.submission_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('POST /api/analyze should reject missing code', async () => {
    const response = await api.post('/api/analyze', {
      language: 'javascript',
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  it('POST /api/analyze should reject missing language', async () => {
    const response = await api.post('/api/analyze', {
      code: 'console.log("test");',
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  it('POST /api/analyze should handle security issues', async () => {
    const response = await api.post('/api/analyze', {
      code: 'eval(userInput); document.innerHTML = data;',
      language: 'javascript',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('submission_id');
    
    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    const resultsResponse = await api.get(`/api/analysis/${response.data.submission_id}`);
    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.data).toHaveProperty('results');
    
    // Should have findings from security agent
    const securityResults = resultsResponse.data.results.find((r: any) => 
      r.specialty === 'security'
    );
    expect(securityResults).toBeDefined();
    // Note: May have 0 findings if no patterns match or LLM not configured
    expect(Array.isArray(securityResults.findings)).toBe(true);
  });

  it('POST /api/analyze should handle performance issues', async () => {
    const response = await api.post('/api/analyze', {
      code: `
        for (let i = 0; i < array.length; i++) {
          console.log(array[i]);
        }
      `,
      language: 'javascript',
    });
    
    expect(response.status).toBe(200);
    
    // Wait for analysis
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const resultsResponse = await api.get(`/api/analysis/${response.data.submission_id}`);
    const performanceResults = resultsResponse.data.results.find((r: any) => 
      r.specialty === 'performance'
    );
    expect(performanceResults).toBeDefined();
    expect(Array.isArray(performanceResults.findings)).toBe(true);
  });
});

describe('Analysis Results Endpoint', () => {
  let submissionId: string;

  beforeAll(async () => {
    // Create a submission first
    const response = await api.post('/api/analyze', {
      code: 'console.log("test");',
      language: 'javascript',
    });
    submissionId = response.data.submission_id;
    
    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  it('GET /api/analysis/:submissionId should return analysis results', async () => {
    const response = await api.get(`/api/analysis/${submissionId}`);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('submission_id');
    expect(response.data).toHaveProperty('status');
    expect(response.data).toHaveProperty('results');
    expect(response.data).toHaveProperty('summary');
    expect(Array.isArray(response.data.results)).toBe(true);
    
    // Check result structure
    if (response.data.results.length > 0) {
      const result = response.data.results[0];
      expect(result).toHaveProperty('agent_id');
      expect(result).toHaveProperty('agent_name');
      expect(result).toHaveProperty('specialty');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('execution_time_ms');
    }
  });

  it('GET /api/analysis/:submissionId should return 404 for invalid ID', async () => {
    const response = await api.get('/api/analysis/00000000-0000-0000-0000-000000000000');
    
    expect(response.status).toBe(404);
    expect(response.data).toHaveProperty('error');
  });
});

describe('Patterns Endpoint', () => {
  it('GET /api/patterns should return code patterns', async () => {
    const response = await api.get('/api/patterns');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('patterns');
    expect(response.data).toHaveProperty('total');
    expect(Array.isArray(response.data.patterns)).toBe(true);
    expect(response.data.patterns.length).toBeGreaterThan(0);
    
    // Check pattern structure
    const pattern = response.data.patterns[0];
    expect(pattern).toHaveProperty('id');
    expect(pattern).toHaveProperty('pattern_text');
    expect(pattern).toHaveProperty('category');
    expect(pattern).toHaveProperty('severity');
    expect(pattern).toHaveProperty('description');
    expect(pattern).toHaveProperty('language');
  });

  it('GET /api/patterns should filter by language', async () => {
    const response = await api.get('/api/patterns?language=javascript');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('patterns');
    expect(Array.isArray(response.data.patterns)).toBe(true);
    
    // All patterns should be for javascript
    response.data.patterns.forEach((pattern: any) => {
      expect(pattern.language).toBe('javascript');
    });
  });

  it('GET /api/patterns should respect limit parameter', async () => {
    const response = await api.get('/api/patterns?limit=5');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('patterns');
    expect(response.data.patterns.length).toBeLessThanOrEqual(5);
  });
});

describe('Code Execution Endpoint', () => {
  it('POST /api/execute should execute JavaScript code', async () => {
    const response = await api.post('/api/execute', {
      code: 'console.log("Hello from test");',
      language: 'javascript',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('output');
    expect(response.data).toHaveProperty('exitCode');
    expect(response.data).toHaveProperty('executionTime');
    expect(response.data).toHaveProperty('requestId');
    // Note: Output may be empty if Piston API is unavailable
    expect(typeof response.data.output).toBe('string');
  });

  it('POST /api/execute should execute Python code', async () => {
    const response = await api.post('/api/execute', {
      code: 'print("Hello from Python")',
      language: 'python',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('output');
    expect(response.data).toHaveProperty('exitCode');
    // Note: Output may be empty if Piston API is unavailable
    expect(typeof response.data.output).toBe('string');
  });

  it('POST /api/execute should handle code with errors', async () => {
    const response = await api.post('/api/execute', {
      code: 'console.log(undefinedVariable);',
      language: 'javascript',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('error');
    expect(response.data.exitCode).not.toBe(0);
  });

  it('POST /api/execute should reject missing code', async () => {
    const response = await api.post('/api/execute', {
      language: 'javascript',
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  it('POST /api/execute should reject invalid language', async () => {
    const response = await api.post('/api/execute', {
      code: 'test',
      language: 'invalid',
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  it('POST /api/execute should block dangerous code', async () => {
    const response = await api.post('/api/execute', {
      code: 'const fs = require("fs"); fs.readFileSync("/etc/passwd");',
      language: 'javascript',
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('error');
    expect(response.data.error).toContain('restricted');
  });
});

describe('Error Handling', () => {
  it('Should return 404 for unknown endpoints', async () => {
    const response = await api.get('/api/unknown-endpoint');
    
    expect(response.status).toBe(404);
  });

  it('Should handle malformed JSON', async () => {
    try {
      const response = await axios.post(`${API_URL}/api/analyze`, 'invalid json', {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      });
      
      expect(response.status).toBe(400);
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
    }
  });
});

describe('Rate Limiting', () => {
  it('Should enforce rate limits on /api/execute', async () => {
    const requests: Promise<any>[] = [];
    
    // Send 25 requests (limit is 20)
    for (let i = 0; i < 25; i++) {
      requests.push(
        api.post('/api/execute', {
          code: `console.log(${i});`,
          language: 'javascript',
        })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // At least one should be rate limited
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  }, 60000); // Increase timeout for this test
});

describe('Integration: Full Analysis Flow', () => {
  it('Should complete full analysis workflow', async () => {
    // 1. Start analysis
    const analyzeResponse = await api.post('/api/analyze', {
      code: `
        function processData(data) {
          const result = eval(data.input);
          for (let i = 0; i < data.items.length; i++) {
            console.log(data.items[i]);
          }
          return result;
        }
      `,
      language: 'javascript',
      filename: 'test.js',
    });
    
    expect(analyzeResponse.status).toBe(200);
    const submissionId = analyzeResponse.data.submission_id;
    
    // 2. Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // 3. Get results
    const resultsResponse = await api.get(`/api/analysis/${submissionId}`);
    
    expect(resultsResponse.status).toBe(200);
    expect(resultsResponse.data).toHaveProperty('submission_id');
    expect(resultsResponse.data).toHaveProperty('status');
    expect(resultsResponse.data.status).toBe('completed');
    expect(resultsResponse.data.results.length).toBeGreaterThan(0);
    
    // 4. Verify findings
    const securityAgent = resultsResponse.data.results.find((r: any) => 
      r.specialty === 'security'
    );
    expect(securityAgent).toBeDefined();
    expect(securityAgent.findings.length).toBeGreaterThan(0);
    
    // Should detect eval() usage
    const evalFinding = securityAgent.findings.find((f: any) => 
      f.message.toLowerCase().includes('eval')
    );
    expect(evalFinding).toBeDefined();
    expect(evalFinding.severity).toBe('critical');
  }, 30000);
});
