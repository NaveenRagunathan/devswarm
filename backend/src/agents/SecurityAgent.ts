import { BaseAgent } from './BaseAgent.js';
import { Finding } from '../types/index.js';
import { analyzeCodeWithLLM, isLLMConfigured } from '../services/llmService.js';

export class SecurityAgent extends BaseAgent {
  async analyze(code: string, language: string): Promise<Finding[]> {
    this.updateProgress('started', 0, 'Initializing security analysis');
    
    const findings: Finding[] = [];

    // Step 1: LLM-powered analysis (if configured)
    if (isLLMConfigured()) {
      this.updateProgress('analyzing', 20, 'Running AI-powered security analysis');
      
      try {
        const llmFindings = await analyzeCodeWithLLM({
          agentType: 'security',
          code,
          language,
          context: 'Analyze for security vulnerabilities, injection attacks, and unsafe practices',
        });
        
        // Convert LLM findings to our Finding format
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
        console.error('[SecurityAgent] LLM analysis failed:', error);
        this.updateProgress('analyzing', 50, 'LLM analysis failed, using pattern matching');
      }
    }

    // Step 2: Pattern matching (fallback or supplement)
    this.updateProgress('searching', 60, 'Loading security patterns');
    const patterns = await this.getRelevantPatterns(language, 20);
    
    this.updateProgress('analyzing', 70, 'Pattern matching for known vulnerabilities');
    const patternFindings = this.matchPatterns(code, patterns);
    findings.push(...patternFindings);

    // Step 3: Language-specific security checks
    this.updateProgress('analyzing', 85, 'Running language-specific checks');
    const languageFindings = await this.languageSpecificChecks(code, language);
    findings.push(...languageFindings);

    this.updateProgress('completed', 100, 'Security analysis complete');
    return findings;
  }

  private async languageSpecificChecks(code: string, language: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        findings.push(...this.checkJavaScriptSecurity(code));
        break;
      case 'python':
        findings.push(...this.checkPythonSecurity(code));
        break;
      case 'java':
        findings.push(...this.checkJavaSecurity(code));
        break;
    }

    return findings;
  }

  private checkJavaScriptSecurity(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    // Check for eval usage
    lines.forEach((line, index) => {
      if (/\beval\s*\(/.test(line)) {
        findings.push({
          severity: 'critical',
          category: 'security',
          message: 'Use of eval() is dangerous and can lead to code injection',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Avoid eval(). Use safer alternatives like JSON.parse() for data or Function constructor with caution',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for innerHTML usage
      if (/\.innerHTML\s*=/.test(line)) {
        findings.push({
          severity: 'high',
          category: 'security',
          message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use textContent or sanitize HTML with DOMPurify',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for dangerouslySetInnerHTML in React
      if (/dangerouslySetInnerHTML/.test(line)) {
        findings.push({
          severity: 'high',
          category: 'security',
          message: 'dangerouslySetInnerHTML can introduce XSS vulnerabilities',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Sanitize HTML content before using dangerouslySetInnerHTML',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }

  private checkPythonSecurity(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for eval/exec usage
      if (/\b(eval|exec)\s*\(/.test(line)) {
        findings.push({
          severity: 'critical',
          category: 'security',
          message: 'Use of eval()/exec() can lead to arbitrary code execution',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use ast.literal_eval() for safe evaluation of literals',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for SQL injection
      if (/execute\s*\([^)]*%s[^)]*\)/.test(line) || /execute\s*\([^)]*\+[^)]*\)/.test(line)) {
        findings.push({
          severity: 'critical',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use parameterized queries instead of string concatenation',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }

  private checkJavaSecurity(code: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for SQL injection
      if (/Statement.*execute.*\+/.test(line)) {
        findings.push({
          severity: 'critical',
          category: 'security',
          message: 'Potential SQL injection vulnerability',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use PreparedStatement with parameterized queries',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }
}
