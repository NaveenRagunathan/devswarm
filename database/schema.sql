-- DevSwarm Database Schema
-- Multi-Agent Code Analysis Platform with Tiger Cloud
-- Requires: pgvector extension for embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS code_patterns CASCADE;
DROP TABLE IF EXISTS code_submissions CASCADE;
DROP TABLE IF EXISTS agent_forks CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- ============================================================================
-- AGENTS TABLE
-- Stores information about each specialized analysis agent
-- ============================================================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(50) NOT NULL CHECK (specialty IN ('security', 'performance', 'accessibility', 'best-practices')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'analyzing', 'error', 'maintenance')),
    fork_id VARCHAR(255),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(specialty)
);

-- Index for quick agent lookups
CREATE INDEX idx_agents_specialty ON agents(specialty);
CREATE INDEX idx_agents_status ON agents(status);

-- ============================================================================
-- AGENT FORKS TABLE
-- Tracks database forks created for isolated agent analysis
-- ============================================================================
CREATE TABLE agent_forks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fork_id VARCHAR(255) NOT NULL UNIQUE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    parent_service_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fork management
CREATE INDEX idx_agent_forks_agent_id ON agent_forks(agent_id);
CREATE INDEX idx_agent_forks_status ON agent_forks(status);
CREATE INDEX idx_agent_forks_expires_at ON agent_forks(expires_at);

-- ============================================================================
-- CODE SUBMISSIONS TABLE
-- Stores code submitted for analysis
-- ============================================================================
CREATE TABLE code_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    filename VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    user_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Indexes for submission queries
CREATE INDEX idx_code_submissions_status ON code_submissions(status);
CREATE INDEX idx_code_submissions_language ON code_submissions(language);
CREATE INDEX idx_code_submissions_user_id ON code_submissions(user_id);
CREATE INDEX idx_code_submissions_submitted_at ON code_submissions(submitted_at DESC);

-- ============================================================================
-- ANALYSIS RESULTS TABLE
-- Stores findings from each agent's analysis
-- ============================================================================
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    findings JSONB NOT NULL DEFAULT '[]',
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    execution_time_ms INTEGER,
    patterns_matched INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for result queries
CREATE INDEX idx_analysis_results_submission_id ON analysis_results(submission_id);
CREATE INDEX idx_analysis_results_agent_id ON analysis_results(agent_id);
CREATE INDEX idx_analysis_results_confidence ON analysis_results(confidence DESC);
CREATE INDEX idx_analysis_results_created_at ON analysis_results(created_at DESC);

-- GIN index for JSONB findings search
CREATE INDEX idx_analysis_results_findings ON analysis_results USING GIN (findings);

-- ============================================================================
-- CODE PATTERNS TABLE
-- Stores known code patterns for hybrid search with pgvector
-- ============================================================================
CREATE TABLE code_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    example_fix TEXT,
    tags TEXT[] DEFAULT '{}',
    embedding vector(1536),  -- OpenAI ada-002 embedding dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for pattern search
CREATE INDEX idx_code_patterns_category ON code_patterns(category);
CREATE INDEX idx_code_patterns_severity ON code_patterns(severity);
CREATE INDEX idx_code_patterns_language ON code_patterns(language);
CREATE INDEX idx_code_patterns_tags ON code_patterns USING GIN (tags);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX idx_code_patterns_embedding ON code_patterns 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index for pattern text
CREATE INDEX idx_code_patterns_pattern_text_fts ON code_patterns 
USING GIN (to_tsvector('english', pattern_text));

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for submission analysis summary
CREATE OR REPLACE VIEW submission_analysis_summary AS
SELECT 
    cs.id,
    cs.language,
    cs.status,
    cs.submitted_at,
    cs.completed_at,
    COUNT(DISTINCT ar.agent_id) as agents_completed,
    SUM(jsonb_array_length(ar.findings)) as total_findings,
    SUM(CASE WHEN ar.findings @> '[{"severity": "critical"}]' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN ar.findings @> '[{"severity": "high"}]' THEN 1 ELSE 0 END) as high_count,
    SUM(CASE WHEN ar.findings @> '[{"severity": "medium"}]' THEN 1 ELSE 0 END) as medium_count,
    SUM(CASE WHEN ar.findings @> '[{"severity": "low"}]' THEN 1 ELSE 0 END) as low_count,
    AVG(ar.confidence) as avg_confidence,
    SUM(ar.execution_time_ms) as total_execution_time_ms
FROM code_submissions cs
LEFT JOIN analysis_results ar ON cs.id = ar.submission_id
GROUP BY cs.id, cs.language, cs.status, cs.submitted_at, cs.completed_at;

-- View for agent performance metrics
CREATE OR REPLACE VIEW agent_performance_metrics AS
SELECT 
    a.id,
    a.name,
    a.specialty,
    COUNT(ar.id) as total_analyses,
    AVG(ar.confidence) as avg_confidence,
    AVG(ar.execution_time_ms) as avg_execution_time_ms,
    SUM(ar.patterns_matched) as total_patterns_matched,
    SUM(jsonb_array_length(ar.findings)) as total_findings
FROM agents a
LEFT JOIN analysis_results ar ON a.id = ar.agent_id
GROUP BY a.id, a.name, a.specialty;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agents table
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for code_patterns table
CREATE TRIGGER update_code_patterns_updated_at
    BEFORE UPDATE ON code_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function for hybrid search (text + vector similarity)
CREATE OR REPLACE FUNCTION search_code_patterns(
    query_text TEXT,
    query_embedding vector(1536),
    search_language VARCHAR(50) DEFAULT NULL,
    result_limit INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    pattern_id UUID,
    pattern_text TEXT,
    category VARCHAR(100),
    severity VARCHAR(20),
    description TEXT,
    similarity_score FLOAT,
    text_rank FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.pattern_text,
        cp.category,
        cp.severity,
        cp.description,
        1 - (cp.embedding <=> query_embedding) as similarity_score,
        ts_rank(to_tsvector('english', cp.pattern_text), plainto_tsquery('english', query_text)) as text_rank
    FROM code_patterns cp
    WHERE 
        (search_language IS NULL OR cp.language = search_language)
        AND (1 - (cp.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY 
        (1 - (cp.embedding <=> query_embedding)) * 0.7 + 
        ts_rank(to_tsvector('english', cp.pattern_text), plainto_tsquery('english', query_text)) * 0.3 DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired forks
CREATE OR REPLACE FUNCTION cleanup_expired_forks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE agent_forks
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default agents
INSERT INTO agents (name, specialty, description) VALUES
    ('Security Sentinel', 'security', 'Identifies security vulnerabilities, injection risks, and unsafe practices'),
    ('Performance Optimizer', 'performance', 'Detects performance bottlenecks, inefficient algorithms, and resource leaks'),
    ('Accessibility Guardian', 'accessibility', 'Ensures code follows accessibility best practices and WCAG guidelines'),
    ('Best Practices Enforcer', 'best-practices', 'Validates code quality, maintainability, and adherence to standards');

-- Insert sample code patterns for security
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix) VALUES
    ('eval(', 'security', 'critical', 'Use of eval() can lead to code injection vulnerabilities', 'javascript', 'Use JSON.parse() for parsing JSON or safer alternatives'),
    ('innerHTML =', 'security', 'high', 'Direct innerHTML assignment can lead to XSS attacks', 'javascript', 'Use textContent or sanitize input with DOMPurify'),
    ('SELECT * FROM', 'security', 'medium', 'SQL query without parameterization may be vulnerable to SQL injection', 'sql', 'Use parameterized queries or prepared statements'),
    ('password', 'security', 'high', 'Potential hardcoded password or sensitive data', 'javascript', 'Use environment variables or secure credential management');

-- Insert sample code patterns for performance
INSERT INTO code_patterns (pattern_text, category, severity, description, language, example_fix) VALUES
    ('for (let i = 0; i < array.length; i++)', 'performance', 'low', 'Array iteration can be optimized', 'javascript', 'Use forEach, map, or cache array.length'),
    ('document.querySelector', 'performance', 'medium', 'Repeated DOM queries can impact performance', 'javascript', 'Cache DOM references in variables'),
    ('SELECT *', 'performance', 'medium', 'Selecting all columns can be inefficient', 'sql', 'Select only required columns');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tsdbadmin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tsdbadmin;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agents IS 'Specialized analysis agents for code review';
COMMENT ON TABLE agent_forks IS 'Database forks for isolated agent execution';
COMMENT ON TABLE code_submissions IS 'Code submitted for multi-agent analysis';
COMMENT ON TABLE analysis_results IS 'Findings from agent analysis with confidence scores';
COMMENT ON TABLE code_patterns IS 'Known code patterns with vector embeddings for hybrid search';

COMMENT ON COLUMN code_patterns.embedding IS 'Vector embedding (1536 dimensions) for semantic similarity search';
COMMENT ON FUNCTION search_code_patterns IS 'Hybrid search combining vector similarity and full-text search';
COMMENT ON FUNCTION cleanup_expired_forks IS 'Marks expired agent forks for cleanup';
