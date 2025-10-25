/**
 * Code Execution Route
 * 
 * POST /api/execute - Execute user code safely
 * Features:
 * - Request validation
 * - Rate limiting (20 req/min per IP)
 * - Execution logging
 * - Error handling
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { executeCode, ExecutionRequest } from '../services/codeExecutor.js';

const router = Router();

// Rate limiter: 20 requests per minute per IP
const executionLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '20', 10), // 20 requests
  message: {
    error: 'Too many execution requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip custom keyGenerator to use default (handles IPv6 properly)
  // The default keyGenerator automatically handles both IPv4 and IPv6
});

// Validation rules
const executeValidation = [
  body('code')
    .isString()
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ max: 50000 })
    .withMessage('Code must be less than 50,000 characters'),
  body('language')
    .isString()
    .isIn(['javascript', 'python', 'typescript'])
    .withMessage('Language must be javascript, python, or typescript'),
  body('stdin')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Stdin must be less than 10,000 characters'),
];

/**
 * POST /api/execute
 * Execute code and return results
 */
router.post(
  '/',
  executionLimiter,
  executeValidation,
  async (req: Request, res: Response) => {
    // Generate request ID for tracking
    const requestId = uuidv4();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.warn(`[Execute:${requestId}] Validation failed:`, errors.array());
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array(),
          requestId,
        });
      }

      const { code, language, stdin }: ExecutionRequest = req.body;

      // Log execution attempt
      console.log(
        `[Execute:${requestId}] ${clientIp} executing ${language} code (${code.length} chars)`
      );

      // Execute code
      const startTime = Date.now();
      const result = await executeCode({ code, language, stdin });
      const totalTime = Date.now() - startTime;

      // Log result
      console.log(
        `[Execute:${requestId}] Completed in ${totalTime}ms, exit code: ${result.exitCode}`
      );

      // Return result
      return res.status(200).json({
        ...result,
        requestId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log error
      console.error(`[Execute:${requestId}] Error:`, error);

      // Return error response
      return res.status(500).json({
        error: 'Internal server error during code execution',
        code: 'EXECUTION_ERROR',
        message: (error as Error).message,
        requestId,
      });
    }
  }
);

/**
 * GET /api/execute/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'code-execution',
    timestamp: new Date().toISOString(),
  });
});

export default router;
