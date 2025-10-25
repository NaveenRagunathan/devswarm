/**
 * Code Execution Service
 * 
 * Executes user code safely using the Piston API (https://emkc.org/api/v2/piston)
 * Features:
 * - Timeout protection (10s)
 * - Code sanitization
 * - Retry logic
 * - Support for JavaScript, Python, TypeScript
 */

import axios, { AxiosError } from 'axios';

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number; // milliseconds
  exitCode: number;
  language: string;
}

export interface ExecutionRequest {
  code: string;
  language: 'javascript' | 'python' | 'typescript';
  stdin?: string;
}

// Piston API endpoint
const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

// Language mappings for Piston API
const LANGUAGE_MAPPINGS: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  typescript: 'typescript',
};

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
  /require\s*\(\s*['"]fs['"]\s*\)/gi,
  /require\s*\(\s*['"]child_process['"]\s*\)/gi,
  /import\s+.*\s+from\s+['"]fs['"]/gi,
  /import\s+.*\s+from\s+['"]child_process['"]/gi,
  /process\.exit/gi,
  /process\.kill/gi,
  /__dirname/gi,
  /__filename/gi,
];

/**
 * Sanitize code to remove dangerous operations
 */
function sanitizeCode(code: string): { safe: boolean; reason?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return {
        safe: false,
        reason: `Code contains restricted operations: ${pattern.source}`,
      };
    }
  }
  return { safe: true };
}

/**
 * Execute code using Piston API with retry logic
 */
async function executePiston(
  request: ExecutionRequest,
  retryCount = 0
): Promise<ExecutionResult> {
  const maxRetries = 2;
  const timeout = 10000; // 10 seconds

  try {
    const startTime = Date.now();

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Map language to Piston format
    const pistonLanguage = LANGUAGE_MAPPINGS[request.language];
    if (!pistonLanguage) {
      throw new Error(`Unsupported language: ${request.language}`);
    }

    // Make request to Piston API
    const response = await axios.post(
      PISTON_API_URL,
      {
        language: pistonLanguage,
        version: '*', // Use latest version
        files: [
          {
            name: `main.${request.language === 'python' ? 'py' : request.language === 'typescript' ? 'ts' : 'js'}`,
            content: request.code,
          },
        ],
        stdin: request.stdin || '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 10000,
      },
      {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    const executionTime = Date.now() - startTime;
    const run = response.data.run;

    // Log execution
    console.log(`[CodeExecutor] Executed ${request.language} code in ${executionTime}ms`);

    return {
      output: run.stdout || '',
      error: run.stderr || null,
      executionTime,
      exitCode: run.code || 0,
      language: request.language,
    };
  } catch (error) {
    // Handle timeout
    if (axios.isCancel(error) || (error as any).code === 'ECONNABORTED') {
      console.error('[CodeExecutor] Execution timed out');
      return {
        output: '',
        error: 'Execution timed out after 10 seconds',
        executionTime: 10000,
        exitCode: 124, // Timeout exit code
        language: request.language,
      };
    }

    // Retry logic for network errors
    if (retryCount < maxRetries && axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 500 || axiosError.code === 'ECONNREFUSED') {
        console.warn(`[CodeExecutor] Retry ${retryCount + 1}/${maxRetries} after error`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
        return executePiston(request, retryCount + 1);
      }
    }

    // Handle other errors
    console.error('[CodeExecutor] Execution error:', error);
    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : (error as Error).message;

    // Check if it's a network timeout (Piston API unavailable)
    const isNetworkError = axios.isAxiosError(error) && 
      (error.code === 'ETIMEDOUT' || error.code === 'ENETUNREACH');

    return {
      output: isNetworkError 
        ? '⚠️ Code execution service temporarily unavailable\n\nThe Piston API is not reachable. This is a network connectivity issue.\nYour code has not been executed.\n\nNote: The frontend has a mock execution fallback that should handle this automatically.'
        : '',
      error: isNetworkError
        ? 'PISTON_UNAVAILABLE'
        : `Execution failed: ${errorMessage}`,
      executionTime: 0,
      exitCode: isNetworkError ? 503 : 1,
      language: request.language,
    };
  }
}

/**
 * Main execution function with sanitization
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  // Sanitize code
  const sanitization = sanitizeCode(request.code);
  if (!sanitization.safe) {
    console.warn('[CodeExecutor] Blocked dangerous code:', sanitization.reason);
    return {
      output: '',
      error: sanitization.reason || 'Code contains restricted operations',
      executionTime: 0,
      exitCode: 1,
      language: request.language,
    };
  }

  // Execute code
  return executePiston(request);
}
