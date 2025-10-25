/**
 * LLM Service for Real AI-Powered Code Analysis
 * 
 * Uses OpenAI GPT-4 or Anthropic Claude for intelligent code analysis
 * instead of just pattern matching
 */

import OpenAI from 'openai';
import { Finding } from '../types/index.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Fallback to Anthropic if OpenAI not available
const useOpenAI = !!process.env.OPENAI_API_KEY;
const useAnthropic = !!process.env.ANTHROPIC_API_KEY;

interface AnalysisPrompt {
  agentType: 'security' | 'performance' | 'accessibility' | 'best-practices';
  code: string;
  language: string;
  context?: string;
}

interface LLMFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  line_start?: number;
  line_end?: number;
  code_snippet?: string;
  suggestion: string;
  explanation: string;
  category: string;
}

/**
 * Get system prompt for each agent type
 */
function getSystemPrompt(agentType: string): string {
  const prompts = {
    security: `You are an expert security analyst specializing in code security vulnerabilities.
Your job is to analyze code and identify security issues like:
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) vulnerabilities
- Authentication/authorization flaws
- Insecure data handling
- Hardcoded secrets
- Unsafe eval() usage
- CSRF vulnerabilities
- Insecure dependencies

Provide specific, actionable findings with severity levels.`,

    performance: `You are an expert performance engineer specializing in code optimization.
Your job is to analyze code and identify performance issues like:
- Inefficient algorithms (O(n²) when O(n) is possible)
- Memory leaks
- Unnecessary re-renders
- Blocking operations
- Inefficient database queries
- Large bundle sizes
- Unoptimized loops
- Excessive DOM manipulation

Provide specific, actionable findings with measurable impact.`,

    accessibility: `You are an expert accessibility specialist (WCAG 2.1 AA/AAA).
Your job is to analyze code and identify accessibility issues like:
- Missing ARIA labels
- Insufficient color contrast
- Missing alt text for images
- Keyboard navigation issues
- Screen reader compatibility
- Focus management problems
- Semantic HTML violations
- Missing form labels

Provide specific, actionable findings with WCAG references.`,

    'best-practices': `You are an expert code reviewer specializing in software engineering best practices.
Your job is to analyze code and identify issues like:
- Code smells and anti-patterns
- Violation of SOLID principles
- Poor error handling
- Inconsistent naming conventions
- Missing documentation
- Overly complex functions
- Tight coupling
- Magic numbers/strings

Provide specific, actionable findings with industry standards.`,
  };

  return prompts[agentType as keyof typeof prompts] || prompts['best-practices'];
}

/**
 * Analyze code using LLM
 */
export async function analyzeCodeWithLLM(
  prompt: AnalysisPrompt
): Promise<LLMFinding[]> {
  if (!useOpenAI && !useAnthropic) {
    console.warn('[LLM] No API key configured, falling back to pattern matching');
    return [];
  }

  try {
    const systemPrompt = getSystemPrompt(prompt.agentType);
    
    const userPrompt = `Analyze this ${prompt.language} code for ${prompt.agentType} issues:

\`\`\`${prompt.language}
${prompt.code}
\`\`\`

${prompt.context ? `Context: ${prompt.context}` : ''}

Provide your analysis as a JSON array of findings. Each finding should have:
- severity: "critical" | "high" | "medium" | "low" | "info"
- message: Brief description of the issue
- line_start: Line number where issue starts (if applicable)
- line_end: Line number where issue ends (if applicable)
- code_snippet: The problematic code snippet
- suggestion: How to fix the issue
- explanation: Detailed explanation of why this is an issue
- category: Category of the issue (e.g., "xss", "sql-injection", "memory-leak")

Return ONLY the JSON array, no additional text.`;

    if (useOpenAI) {
      return await analyzeWithOpenAI(systemPrompt, userPrompt);
    } else if (useAnthropic) {
      return await analyzeWithAnthropic(systemPrompt, userPrompt);
    }

    return [];
  } catch (error) {
    console.error('[LLM] Analysis error:', error);
    return [];
  }
}

/**
 * Analyze with OpenAI GPT-4
 */
async function analyzeWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMFinding[]> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    // Parse JSON response
    const parsed = JSON.parse(content);
    
    // Handle both array and object with findings array
    const findings = Array.isArray(parsed) ? parsed : (parsed.findings || []);
    
    return findings.map((f: any) => ({
      severity: f.severity || 'info',
      message: f.message || 'Issue detected',
      line_start: f.line_start,
      line_end: f.line_end,
      code_snippet: f.code_snippet,
      suggestion: f.suggestion || 'Review and fix this issue',
      explanation: f.explanation || '',
      category: f.category || 'general',
    }));
  } catch (error) {
    console.error('[OpenAI] Analysis error:', error);
    return [];
  }
}

/**
 * Analyze with Anthropic Claude
 */
async function analyzeWithAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMFinding[]> {
  try {
    // TODO: Implement Anthropic integration
    // For now, return empty array
    console.log('[Anthropic] Not yet implemented');
    return [];
  } catch (error) {
    console.error('[Anthropic] Analysis error:', error);
    return [];
  }
}

/**
 * Chat with agent about a specific finding
 */
export async function chatWithAgent(
  agentType: string,
  finding: Finding,
  userQuestion: string,
  codeContext?: string
): Promise<string> {
  if (!useOpenAI && !useAnthropic) {
    return 'LLM chat is not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.';
  }

  try {
    const systemPrompt = `${getSystemPrompt(agentType)}

You are now in a conversation with a developer who has a question about a specific code issue you identified.
Be helpful, concise, and provide actionable advice.`;

    const userPrompt = `Issue: ${finding.message}
${finding.code_snippet ? `\nCode:\n\`\`\`\n${finding.code_snippet}\n\`\`\`` : ''}
${finding.suggestion ? `\nSuggestion: ${finding.suggestion}` : ''}
${codeContext ? `\nFull context:\n\`\`\`\n${codeContext}\n\`\`\`` : ''}

Developer's question: ${userQuestion}`;

    if (useOpenAI) {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'No response generated';
    }

    return 'Chat not available';
  } catch (error) {
    console.error('[LLM] Chat error:', error);
    return 'Sorry, I encountered an error processing your question.';
  }
}

/**
 * Get code explanation from LLM
 */
export async function explainCode(
  code: string,
  language: string
): Promise<string> {
  if (!useOpenAI) {
    return 'Code explanation requires OpenAI API key';
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert programmer who explains code clearly and concisely.',
        },
        {
          role: 'user',
          content: `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    return response.choices[0].message.content || 'No explanation generated';
  } catch (error) {
    console.error('[LLM] Explanation error:', error);
    return 'Error generating explanation';
  }
}

/**
 * Check if LLM is configured
 */
export function isLLMConfigured(): boolean {
  return useOpenAI || useAnthropic;
}

/**
 * Get LLM provider info
 */
export function getLLMProvider(): string {
  if (useOpenAI) return 'OpenAI GPT-4';
  if (useAnthropic) return 'Anthropic Claude';
  return 'None (Pattern matching only)';
}
