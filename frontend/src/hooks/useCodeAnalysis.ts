import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const WS_URL = API_URL.replace('http', 'ws');

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line_start?: number;
  line_end?: number;
  code_snippet?: string;
  suggestion?: string;
  pattern_match_id?: string;
}

export interface AgentProgress {
  agent_id: string;
  agent_name: string;
  status: 'started' | 'searching' | 'analyzing' | 'completed' | 'error';
  progress_percent: number;
  current_step?: string;
}

export interface AgentResult {
  id: string;
  name: string;
  specialty: string;
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  findings: Finding[];
  progress: number;
  executionTime?: number;
  forkDetails?: {
    fork_id: string;
    queries: number;
    patterns_matched: number;
  };
}

interface AnalysisResponse {
  submission_id: string;
  status: string;
  message: string;
}

interface WSMessage {
  type: 'analysis_started' | 'agent_progress' | 'analysis_complete' | 'error';
  payload: any;
}

export function useCodeAnalysis() {
  const [agents, setAgents] = useState<AgentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [totalExecutionTime, setTotalExecutionTime] = useState(0);
  const [tigerStats, setTigerStats] = useState({
    forksCreated: 0,
    patternsSearched: 0,
    queriesExecuted: 0,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize agents from backend
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/agents`);
      const data = await response.json();
      
      setAgents(data.agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        specialty: agent.specialty,
        status: 'idle',
        findings: [],
        progress: 0,
      })));
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  // WebSocket connection management
  const connectWebSocket = useCallback((subId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to submission updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        submission_id: subId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (submissionId) {
          connectWebSocket(submissionId);
        }
      }, 3000);
    };
  }, [submissionId]);

  const handleWebSocketMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'analysis_started':
        setIsAnalyzing(true);
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'analyzing',
          progress: 0,
          findings: [],
        })));
        break;

      case 'agent_progress':
        const progress: AgentProgress = message.payload;
        setAgents(prev => prev.map(agent => 
          agent.id === progress.agent_id
            ? {
                ...agent,
                status: progress.status === 'completed' ? 'completed' : 'analyzing',
                progress: progress.progress_percent,
              }
            : agent
        ));
        break;

      case 'analysis_complete':
        setIsAnalyzing(false);
        setTotalExecutionTime(message.payload.execution_time_ms || 0);
        fetchAnalysisResults(message.payload.submission_id);
        break;

      case 'error':
        setIsAnalyzing(false);
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'error',
        })));
        console.error('Analysis error:', message.payload);
        break;
    }
  };

  const fetchAnalysisResults = async (subId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/analysis/${subId}`);
      const data = await response.json();

      // Update agents with findings
      if (data.results) {
        setAgents(prev => prev.map(agent => {
          const result = data.results.find((r: any) => r.agent_id === agent.id);
          if (result) {
            return {
              ...agent,
              status: 'completed',
              findings: result.findings || [],
              executionTime: result.execution_time_ms,
              progress: 100,
            };
          }
          return agent;
        }));

        // Update Tiger stats
        const totalPatterns = data.results.reduce((sum: number, r: any) => 
          sum + (r.patterns_matched || 0), 0
        );
        setTigerStats({
          forksCreated: data.results.length,
          patternsSearched: totalPatterns,
          queriesExecuted: data.results.length * 7, // Approximate
        });
      }
    } catch (error) {
      console.error('Failed to fetch analysis results:', error);
    }
  };

  const analyze = async (code: string, language: string) => {
    try {
      setIsAnalyzing(true);
      
      // Reset agents
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'analyzing',
        findings: [],
        progress: 0,
      })));

      // Start analysis
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          filename: `code.${language}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const data: AnalysisResponse = await response.json();
      setSubmissionId(data.submission_id);
      
      // Connect WebSocket for real-time updates
      connectWebSocket(data.submission_id);

      return data.submission_id;
    } catch (error) {
      setIsAnalyzing(false);
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'error',
      })));
      throw error;
    }
  };

  const reset = () => {
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'idle',
      findings: [],
      progress: 0,
    })));
    setIsAnalyzing(false);
    setTotalExecutionTime(0);
    setTigerStats({
      forksCreated: 0,
      patternsSearched: 0,
      queriesExecuted: 0,
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    agents,
    isAnalyzing,
    analyze,
    reset,
    totalExecutionTime,
    tigerStats,
  };
}
