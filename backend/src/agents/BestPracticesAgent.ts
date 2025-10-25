import { BaseAgent } from './BaseAgent.js';
import { Finding } from '../types/index.js';

export class BestPracticesAgent extends BaseAgent {
  async analyze(code: string, language: string): Promise<Finding[]> {
    this.updateProgress('started', 0, 'Initializing best practices analysis');
    
    const findings: Finding[] = [];

    // Step 1: Load best practice patterns
    this.updateProgress('searching', 20, 'Loading best practice patterns');
    const patterns = await this.getRelevantPatterns(language, 20);
    
    // Step 2: Pattern matching
    this.updateProgress('analyzing', 40, 'Scanning for code quality issues');
    const patternFindings = this.matchPatterns(code, patterns);
    findings.push(...patternFindings);

    // Step 3: Language-specific checks
    this.updateProgress('analyzing', 60, 'Running language-specific checks');
    const languageFindings = this.checkBestPractices(code, language);
    findings.push(...languageFindings);

    // Step 4: Code style and conventions
    this.updateProgress('analyzing', 80, 'Checking code style');
    const styleFindings = this.checkCodeStyle(code);
    findings.push(...styleFindings);

    this.updateProgress('completed', 100, 'Best practices analysis complete');
    return findings;
  }

  private checkBestPractices(code: string, language: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for var usage in JavaScript
      if ((language === 'javascript' || language === 'typescript') && /\bvar\s+/.test(line)) {
        findings.push({
          severity: 'low',
          category: 'best-practices',
          message: 'Use const or let instead of var',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Replace var with const (for constants) or let (for variables)',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for == instead of ===
      if (/[^=!]==[^=]/.test(line)) {
        findings.push({
          severity: 'low',
          category: 'best-practices',
          message: 'Use strict equality (===) instead of loose equality (==)',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Replace == with === for type-safe comparison',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for magic numbers
      if (/\b\d{3,}\b/.test(line) && !/const|let|var/.test(line)) {
        findings.push({
          severity: 'info',
          category: 'best-practices',
          message: 'Magic number detected - consider using named constant',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Extract number to a named constant for better readability',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for TODO comments
      if (/\/\/\s*TODO|#\s*TODO/.test(line)) {
        findings.push({
          severity: 'info',
          category: 'best-practices',
          message: 'TODO comment found - incomplete implementation',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Complete the implementation or create a ticket',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for empty catch blocks
      if (/catch\s*\([^)]*\)\s*{\s*}/.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'best-practices',
          message: 'Empty catch block - errors are silently swallowed',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Log the error or handle it appropriately',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for console.log (should use proper logging)
      if (/console\.(log|error|warn)/.test(line) && !line.trim().startsWith('//')) {
        findings.push({
          severity: 'info',
          category: 'best-practices',
          message: 'Console statement found - use proper logging library',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use a logging library like winston or pino for production code',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }

  private checkCodeStyle(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for long lines
      if (line.length > 120) {
        findings.push({
          severity: 'info',
          category: 'best-practices',
          message: `Line too long (${line.length} characters) - consider breaking it up`,
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Keep lines under 120 characters for better readability',
        });
      }

      // Check for multiple statements on one line
      if ((line.match(/;/g) || []).length > 1 && !line.includes('for')) {
        findings.push({
          severity: 'info',
          category: 'best-practices',
          message: 'Multiple statements on one line',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Put each statement on its own line',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for inconsistent indentation
      if (/^\s+/.test(line)) {
        const indent = line.match(/^\s+/)?.[0];
        if (indent && indent.includes('\t') && indent.includes(' ')) {
          findings.push({
            severity: 'info',
            category: 'best-practices',
            message: 'Mixed tabs and spaces in indentation',
            line_start: index + 1,
            line_end: index + 1,
            suggestion: 'Use consistent indentation (either tabs or spaces)',
          });
        }
      }
    });

    return findings;
  }
}
