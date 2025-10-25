/**
 * Code Execution Hook
 * 
 * Custom hook for executing code via the backend API
 * Features:
 * - Loading states
 * - Error handling
 * - Execution history
 * - Timeout protection
 */

import { useState, useCallback } from 'react';

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
  exitCode: number;
  language: string;
  requestId?: string;
  timestamp?: string;
}

export interface UseCodeExecutionReturn {
  execute: (code: string, language: string, stdin?: string) => Promise<void>;
  result: ExecutionResult | null;
  loading: boolean;
  error: string | null;
  clear: () => void;
  history: ExecutionResult[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const EXECUTION_TIMEOUT = 15000; // 15 seconds

/**
 * Mock execution for when Piston API is down
 * Simulates code execution output
 */
function mockExecute(code: string, language: string): ExecutionResult {
  
  // Simulate execution delay
  const executionTime = Math.floor(Math.random() * 500) + 200;
  
  // Generate mock output based on code
  let output = '';
  
  if (language === 'python') {
    if (code.includes('print')) {
      const printMatches = code.match(/print\s*\(\s*["'](.+?)["']\s*\)/g);
      if (printMatches) {
        output = printMatches.map(m => {
          const match = m.match(/["'](.+?)["']/);
          return match ? match[1] : '';
        }).join('\n');
      }
    } else {
      output = ''; // No output for code without print
    }
  } else if (language === 'javascript') {
    if (code.includes('console.log')) {
      const logMatches = code.match(/console\.log\s*\(\s*["'](.+?)["']\s*\)/g);
      if (logMatches) {
        output = logMatches.map(m => {
          const match = m.match(/["'](.+?)["']/);
          return match ? match[1] : '';
        }).join('\n');
      }
    }
  }
  
  // Add helpful message if we have output
  const finalOutput = output 
    ? `${output}\n\n--- Mock Execution ---\n(Piston API unavailable - showing simulated output)`
    : '(No output - Mock execution active)\n\nNote: Mock execution can only show simple print/console.log statements.\nFor full code execution, the Piston API needs to be accessible.';
  
  return {
    output: finalOutput,
    error: null,
    executionTime,
    exitCode: 0,
    language,
    timestamp: new Date().toISOString(),
  };
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExecutionResult[]>([]);

  const execute = useCallback(async (code: string, language: string, stdin?: string) => {
    setLoading(true);
    setError(null);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT);

    try {
      const response = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language, stdin }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request. Please check your code.');
        }
        
        throw new Error(errorData.error || `Execution failed with status ${response.status}`);
      }

      const executionResult: ExecutionResult = await response.json();
      
      // Check if backend returned a Piston unavailable error
      if (executionResult.error === 'PISTON_UNAVAILABLE' || executionResult.exitCode === 503) {
        console.warn('[CodeExecution] Piston API unavailable, using mock execution');
        throw new Error('Piston API unavailable');
      }
      
      setResult(executionResult);
      
      // Add to history (keep last 5)
      setHistory(prev => {
        const newHistory = [executionResult, ...prev].slice(0, 5);
        return newHistory;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      console.warn('[CodeExecution] API failed, using mock execution:', errorMessage);
      
      // Use mock execution as fallback
      try {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
        const mockResult = mockExecute(code, language);
        setResult(mockResult);
        setHistory(prev => [mockResult, ...prev].slice(0, 5));
      } catch (mockErr) {
        // If even mock fails, show error
        setError('Execution failed: ' + errorMessage);
        setResult({
          output: '',
          error: errorMessage,
          executionTime: 0,
          exitCode: 1,
          language,
        });
      }
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    execute,
    result,
    loading,
    error,
    clear,
    history,
  };
}
