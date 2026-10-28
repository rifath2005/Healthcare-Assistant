-- Migration 03: pgvector Extension and RAG Knowledge Base

CREATE EXTENSION IF NOT EXISTS vector;

-- Health documents table for RAG
CREATE TABLE IF NOT EXISTS public.health_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on health_documents (Public read-only, admin insert/update/delete)
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read health documents"
    ON public.health_documents FOR SELECT
    USING (true);

-- HNSW cosine index for sub-150ms vector similarity searches
CREATE INDEX IF NOT EXISTS idx_health_documents_embedding_hnsw 
    ON public.health_documents 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RPC function for vector similarity matching
CREATE OR REPLACE FUNCTION match_health_documents(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    source_url TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hd.id,
        hd.title,
        hd.content,
        hd.source_url,
        hd.metadata,
        (1 - (hd.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.health_documents hd
    WHERE (1 - (hd.embedding <=> query_embedding)) >= match_threshold
    ORDER BY hd.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
