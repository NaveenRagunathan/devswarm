-- Migration 001: Initial Schema Setup
-- This migration creates the foundational tables for DevSwarm

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pgvector is optional - only needed for semantic search
-- CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
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

CREATE INDEX IF NOT EXISTS idx_agents_specialty ON agents(specialty);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Create agent_forks table
CREATE TABLE IF NOT EXISTS agent_forks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fork_id VARCHAR(255) NOT NULL UNIQUE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    parent_service_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_forks_agent_id ON agent_forks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_forks_status ON agent_forks(status);
CREATE INDEX IF NOT EXISTS idx_agent_forks_expires_at ON agent_forks(expires_at);

-- Create code_submissions table
CREATE TABLE IF NOT EXISTS code_submissions (
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

CREATE INDEX IF NOT EXISTS idx_code_submissions_status ON code_submissions(status);
CREATE INDEX IF NOT EXISTS idx_code_submissions_language ON code_submissions(language);
CREATE INDEX IF NOT EXISTS idx_code_submissions_user_id ON code_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_submitted_at ON code_submissions(submitted_at DESC);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
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

CREATE INDEX IF NOT EXISTS idx_analysis_results_submission_id ON analysis_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_agent_id ON analysis_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_confidence ON analysis_results(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_findings ON analysis_results USING GIN (findings);

-- Create code_patterns table (vector support disabled for now)
CREATE TABLE IF NOT EXISTS code_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    example_fix TEXT,
    tags TEXT[] DEFAULT '{}',
    -- embedding vector(1536),  -- Requires pgvector extension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_patterns_category ON code_patterns(category);
CREATE INDEX IF NOT EXISTS idx_code_patterns_severity ON code_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_code_patterns_language ON code_patterns(language);
CREATE INDEX IF NOT EXISTS idx_code_patterns_tags ON code_patterns USING GIN (tags);
-- CREATE INDEX idx_code_patterns_embedding ON code_patterns USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);  -- Requires pgvector
CREATE INDEX IF NOT EXISTS idx_code_patterns_pattern_text_fts ON code_patterns USING GIN (to_tsvector('english', pattern_text));

COMMIT;
