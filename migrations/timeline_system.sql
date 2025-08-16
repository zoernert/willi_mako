-- Timeline-System Migration
-- Füge zur bestehenden Datenbank-Struktur hinzu

-- Timeline Tabelle
CREATE TABLE IF NOT EXISTS timelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE NULL
);

-- Timeline Aktivitäten
CREATE TABLE IF NOT EXISTS timeline_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
    feature_name VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Queue für asynchrone LLM-Verarbeitung
CREATE TABLE IF NOT EXISTS timeline_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES timeline_activities(id) ON DELETE CASCADE,
    raw_data JSONB NOT NULL,
    prompt_template VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'queued',
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Timeline Sharing
CREATE TABLE IF NOT EXISTS timeline_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'read',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_timelines_user_id ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_timelines_active ON timelines(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_timeline_activities_timeline_id ON timeline_activities(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_activities_created_at ON timeline_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_processing_queue_status ON timeline_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_timeline_processing_queue_priority ON timeline_processing_queue(priority, created_at);

-- Trigger für updated_at Spalte
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timelines_updated_at 
    BEFORE UPDATE ON timelines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
