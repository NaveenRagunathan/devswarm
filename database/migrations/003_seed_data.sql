-- Migration 003: Seed Data
-- This migration populates initial agents and sample patterns

BEGIN;

-- Insert default agents
INSERT INTO agents (name, specialty, description) VALUES
    ('Security Sentinel', 'security', 'Identifies security vulnerabilities, injection risks, and unsafe practices'),
    ('Performance Optimizer', 'performance', 'Detects performance bottlenecks, inefficient algorithms, and resource leaks'),
    ('Accessibility Guardian', 'accessibility', 'Ensures code follows accessibility best practices and WCAG guidelines'),
    ('Best Practices Enforcer', 'best-practices', 'Validates code quality, maintainability, and adherence to standards')
ON CONFLICT (specialty) DO NOTHING;

-- Insert sample security patterns
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix, tags) VALUES
    ('eval(', 'security', 'critical', 'Use of eval() can lead to code injection vulnerabilities', 'javascript', 'Use JSON.parse() for parsing JSON or safer alternatives', ARRAY['injection', 'dangerous']),
    ('innerHTML =', 'security', 'high', 'Direct innerHTML assignment can lead to XSS attacks', 'javascript', 'Use textContent or sanitize input with DOMPurify', ARRAY['xss', 'dom']),
    ('SELECT * FROM', 'security', 'medium', 'SQL query without parameterization may be vulnerable to SQL injection', 'sql', 'Use parameterized queries or prepared statements', ARRAY['sql-injection', 'database']),
    ('password', 'security', 'high', 'Potential hardcoded password or sensitive data', 'javascript', 'Use environment variables or secure credential management', ARRAY['credentials', 'secrets']),
    ('crypto.createHash(''md5'')', 'security', 'high', 'MD5 is cryptographically broken and should not be used', 'javascript', 'Use SHA-256 or stronger hashing algorithms', ARRAY['cryptography', 'hashing']),
    ('dangerouslySetInnerHTML', 'security', 'critical', 'React prop that bypasses XSS protection', 'javascript', 'Sanitize content or use safe rendering methods', ARRAY['react', 'xss'])
ON CONFLICT DO NOTHING;

-- Insert sample performance patterns
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix, tags) VALUES
    ('for (let i = 0; i < array.length; i++)', 'performance', 'low', 'Array iteration can be optimized', 'javascript', 'Use forEach, map, or cache array.length', ARRAY['loops', 'optimization']),
    ('document.querySelector', 'performance', 'medium', 'Repeated DOM queries can impact performance', 'javascript', 'Cache DOM references in variables', ARRAY['dom', 'caching']),
    ('SELECT *', 'performance', 'medium', 'Selecting all columns can be inefficient', 'sql', 'Select only required columns', ARRAY['database', 'query-optimization']),
    ('console.log', 'performance', 'low', 'Console logging in production can impact performance', 'javascript', 'Remove or conditionally disable console logs in production', ARRAY['logging', 'production']),
    ('setTimeout(function', 'performance', 'low', 'Anonymous functions in setTimeout can be harder to optimize', 'javascript', 'Use named functions for better performance', ARRAY['async', 'functions'])
ON CONFLICT DO NOTHING;

-- Insert sample accessibility patterns
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix, tags) VALUES
    ('<img', 'accessibility', 'high', 'Images should have alt attributes for screen readers', 'html', 'Add alt attribute with descriptive text', ARRAY['a11y', 'images']),
    ('<button', 'accessibility', 'medium', 'Buttons should have accessible labels', 'html', 'Add aria-label or visible text content', ARRAY['a11y', 'buttons']),
    ('onClick', 'accessibility', 'medium', 'Click handlers should also support keyboard navigation', 'javascript', 'Add onKeyPress handler for Enter/Space keys', ARRAY['a11y', 'keyboard']),
    ('color:', 'accessibility', 'low', 'Color alone should not convey information', 'css', 'Use additional visual indicators (icons, text)', ARRAY['a11y', 'color-contrast'])
ON CONFLICT DO NOTHING;

-- Insert sample best practices patterns
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix, tags) VALUES
    ('var ', 'best-practices', 'medium', 'Use const or let instead of var', 'javascript', 'Replace var with const (immutable) or let (mutable)', ARRAY['es6', 'variables']),
    ('== ', 'best-practices', 'medium', 'Use strict equality (===) instead of loose equality (==)', 'javascript', 'Replace == with ===', ARRAY['comparison', 'type-safety']),
    ('catch (e) {}', 'best-practices', 'high', 'Empty catch blocks hide errors', 'javascript', 'Log errors or handle them appropriately', ARRAY['error-handling', 'debugging']),
    ('TODO', 'best-practices', 'low', 'TODO comments indicate incomplete work', 'javascript', 'Complete the task or create a proper issue tracker item', ARRAY['comments', 'technical-debt']),
    ('function(', 'best-practices', 'low', 'Consider using arrow functions for cleaner syntax', 'javascript', 'Use arrow functions: () => {}', ARRAY['es6', 'functions'])
ON CONFLICT DO NOTHING;

COMMIT;
