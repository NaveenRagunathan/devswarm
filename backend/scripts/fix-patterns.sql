-- Fix invalid regex patterns in code_patterns table
-- These patterns have unescaped special characters that cause regex errors

-- Fix eval( pattern - escape the parenthesis
UPDATE code_patterns 
SET pattern_text = 'eval\\('
WHERE pattern_text = 'eval(' OR pattern_text LIKE '%eval(%';

-- Fix function( pattern - escape the parenthesis
UPDATE code_patterns 
SET pattern_text = 'function\\s*\\('
WHERE pattern_text = 'function(' OR pattern_text LIKE '%function(%';

-- Fix setTimeout(function pattern - escape parentheses
UPDATE code_patterns 
SET pattern_text = 'setTimeout\\s*\\(\\s*function'
WHERE pattern_text LIKE '%setTimeout(function%';

-- Fix for loop pattern - escape parentheses and special chars
UPDATE code_patterns 
SET pattern_text = 'for\\s*\\(\\s*let\\s+\\w+\\s*=\\s*0;.*\\.length'
WHERE pattern_text LIKE '%for (let i = 0; i < array.length; i++)%';

-- Alternative: Just use simple string matching for common patterns
UPDATE code_patterns 
SET pattern_text = 'console\\.log'
WHERE pattern_text = 'console.log';

UPDATE code_patterns 
SET pattern_text = 'document\\.getElementById'
WHERE pattern_text = 'document.getElementById';

-- Show updated patterns
SELECT id, pattern_text, category, severity 
FROM code_patterns 
WHERE pattern_text ~ '[()]'
ORDER BY category, severity;
