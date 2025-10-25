import { BaseAgent } from './BaseAgent.js';
import { Finding } from '../types/index.js';
import { analyzeCodeWithLLM, isLLMConfigured } from '../services/llmService.js';

export class PerformanceAgent extends BaseAgent {
  async analyze(code: string, language: string): Promise<Finding[]> {
    this.updateProgress('started', 0, 'Initializing performance analysis');
    
    const findings: Finding[] = [];

    // Step 1: LLM-powered analysis (if configured)
    if (isLLMConfigured()) {
      this.updateProgress('analyzing', 20, 'Running AI-powered performance analysis');
      
      try {
        const llmFindings = await analyzeCodeWithLLM({
          agentType: 'performance',
          code,
          language,
          context: 'Analyze for performance bottlenecks, inefficient algorithms, and optimization opportunities',
        });
        
        const convertedFindings: Finding[] = llmFindings.map(f => ({
          severity: f.severity,
          category: f.category,
          message: f.message,
          line_start: f.line_start,
          line_end: f.line_end,
          code_snippet: f.code_snippet,
          suggestion: f.suggestion,
        }));
        
        findings.push(...convertedFindings);
        this.updateProgress('analyzing', 50, `Found ${llmFindings.length} AI-detected issues`);
      } catch (error) {
        console.error('[PerformanceAgent] LLM analysis failed:', error);
      }
    }

    // Step 2: Load performance patterns
    this.updateProgress('searching', 60, 'Loading performance patterns');
    const patterns = await this.getRelevantPatterns(language, 20);
    
    // Step 2: Pattern matching
    this.updateProgress('analyzing', 40, 'Scanning for performance issues');
    const patternFindings = this.matchPatterns(code, patterns);
    findings.push(...patternFindings);

    // Step 3: Language-specific performance checks
    this.updateProgress('analyzing', 60, 'Running language-specific checks');
    const languageFindings = await this.languageSpecificChecks(code, language);
    findings.push(...languageFindings);

    // Step 4: Complexity analysis
    this.updateProgress('analyzing', 80, 'Analyzing code complexity');
    const complexityFindings = this.analyzeComplexity(code);
    findings.push(...complexityFindings);

    this.updateProgress('completed', 100, 'Performance analysis complete');
    return findings;
  }

  private async languageSpecificChecks(code: string, language: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        findings.push(...this.checkJavaScriptPerformance(code));
        break;
      case 'python':
        findings.push(...this.checkPythonPerformance(code));
        break;
    }

    return findings;
  }

  private checkJavaScriptPerformance(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for nested loops
      if (/for\s*\([^)]*\)/.test(line)) {
        const remainingCode = lines.slice(index).join('\n');
        const nestedLoopMatch = remainingCode.match(/for\s*\([^)]*\)[^{]*{[^}]*for\s*\(/);
        if (nestedLoopMatch) {
          findings.push({
            severity: 'medium',
            category: 'performance',
            message: 'Nested loops detected - potential O(n²) or worse complexity',
            line_start: index + 1,
            line_end: index + 1,
            suggestion: 'Consider using hash maps or optimizing the algorithm',
            code_snippet: this.extractSnippet(code, index + 1),
          });
        }
      }

      // Check for array operations in loops
      if (/for\s*\([^)]*\)/.test(line) && /\.(push|concat|splice)/.test(line)) {
        findings.push({
          severity: 'low',
          category: 'performance',
          message: 'Array mutation in loop - consider pre-allocating or using different approach',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Pre-allocate array size or use array methods like map/filter',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for console.log in production code
      if (/console\.(log|debug|info|warn)/.test(line)) {
        findings.push({
          severity: 'info',
          category: 'performance',
          message: 'Console statements can impact performance in production',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Remove console statements or use a logging library with levels',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for synchronous operations that could be async
      if (/fs\.readFileSync|fs\.writeFileSync/.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'performance',
          message: 'Synchronous file operation blocks the event loop',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use async versions (readFile, writeFile) with async/await',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }

  private checkPythonPerformance(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for list concatenation in loops
      if (/for\s+.*:/.test(line) && /\+=\s*\[/.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'performance',
          message: 'List concatenation in loop is inefficient',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use list.append() or list comprehension instead',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for global variable access in loops
      if (/for\s+.*:/.test(line) && /global\s+/.test(line)) {
        findings.push({
          severity: 'low',
          category: 'performance',
          message: 'Global variable access in loop can be slow',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Cache global variables in local scope before loop',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }

  private analyzeComplexity(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    // Count nesting levels
    let maxNesting = 0;
    let currentNesting = 0;
    let nestingLine = 0;

    lines.forEach((line, index) => {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      currentNesting += openBraces - closeBraces;

      if (currentNesting > maxNesting) {
        maxNesting = currentNesting;
        nestingLine = index + 1;
      }
    });

    if (maxNesting > 4) {
      findings.push({
        severity: 'medium',
        category: 'performance',
        message: `High nesting level detected (${maxNesting} levels) - code complexity issue`,
        line_start: nestingLine,
        line_end: nestingLine,
        suggestion: 'Refactor into smaller functions or use early returns to reduce nesting',
        code_snippet: this.extractSnippet(code, nestingLine),
      });
    }

    // Check function length
    const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/gs);
    if (functionMatches) {
      functionMatches.forEach(func => {
        const lineCount = func.split('\n').length;
        if (lineCount > 50) {
          findings.push({
            severity: 'low',
            category: 'performance',
            message: `Long function detected (${lineCount} lines) - maintainability and performance concern`,
            suggestion: 'Break down into smaller, focused functions',
          });
        }
      });
    }

    return findings;
  }
}
