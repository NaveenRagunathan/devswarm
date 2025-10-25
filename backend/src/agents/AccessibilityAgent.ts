import { BaseAgent } from './BaseAgent.js';
import { Finding } from '../types/index.js';

export class AccessibilityAgent extends BaseAgent {
  async analyze(code: string, language: string): Promise<Finding[]> {
    this.updateProgress('started', 0, 'Initializing accessibility analysis');
    
    const findings: Finding[] = [];

    // Step 1: Load accessibility patterns
    this.updateProgress('searching', 25, 'Loading accessibility patterns');
    const patterns = await this.getRelevantPatterns(language, 20);
    
    // Step 2: Pattern matching
    this.updateProgress('analyzing', 50, 'Scanning for accessibility issues');
    const patternFindings = this.matchPatterns(code, patterns);
    findings.push(...patternFindings);

    // Step 3: HTML/JSX specific checks
    this.updateProgress('analyzing', 75, 'Checking ARIA and semantic HTML');
    const a11yFindings = this.checkAccessibility(code, language);
    findings.push(...a11yFindings);

    this.updateProgress('completed', 100, 'Accessibility analysis complete');
    return findings;
  }

  private checkAccessibility(code: string, _language: string): Finding[] {
    const findings: Finding[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for images without alt text
      if (/<img[^>]*>/.test(line) && !/<img[^>]*alt=/.test(line)) {
        findings.push({
          severity: 'high',
          category: 'accessibility',
          message: 'Image missing alt attribute for screen readers',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Add descriptive alt text: <img src="..." alt="Description of image">',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for buttons without accessible labels
      if (/<button[^>]*>/.test(line) && /<button[^>]*>\s*<\/button>/.test(line)) {
        findings.push({
          severity: 'high',
          category: 'accessibility',
          message: 'Button without text content or aria-label',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Add text content or aria-label to describe button action',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for form inputs without labels
      if (/<input[^>]*type=["'](?!hidden)/.test(line) && !/<label/.test(code)) {
        findings.push({
          severity: 'medium',
          category: 'accessibility',
          message: 'Form input may be missing associated label',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Wrap input in <label> or use aria-label/aria-labelledby',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for onClick on non-interactive elements
      if (/onClick/.test(line) && /<div[^>]*onClick/.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'accessibility',
          message: 'onClick handler on non-interactive element (div)',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Use <button> or add role="button" and keyboard handlers',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for missing language attribute
      if (/<html[^>]*>/.test(line) && !/<html[^>]*lang=/.test(line)) {
        findings.push({
          severity: 'medium',
          category: 'accessibility',
          message: 'HTML element missing lang attribute',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Add lang attribute: <html lang="en">',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }

      // Check for color-only information
      if (/color:\s*['"]?(red|green|#[0-9a-f]{3,6})/.test(line) && /error|success|warning/.test(line)) {
        findings.push({
          severity: 'low',
          category: 'accessibility',
          message: 'Information conveyed by color alone',
          line_start: index + 1,
          line_end: index + 1,
          suggestion: 'Add text, icons, or patterns in addition to color',
          code_snippet: this.extractSnippet(code, index + 1),
        });
      }
    });

    return findings;
  }
}
