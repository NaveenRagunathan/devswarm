-- Migration 002: Functions and Views
-- This migration adds helper functions and views for DevSwarm

BEGIN;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_code_patterns_updated_at ON code_patterns;
CREATE TRIGGER update_code_patterns_updated_at
    BEFORE UPDATE ON code_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Hybrid search function
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

-- Fork cleanup function
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

-- Submission analysis summary view
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

-- Agent performance metrics view
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

COMMIT;
