-- Migration: Add admin chat configuration tables
-- Date: 2025-01-26

-- Chat configurations table
CREATE TABLE IF NOT EXISTS chat_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Configuration JSON
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Performance metrics
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    test_count INTEGER DEFAULT 0
);

-- Chat test sessions table
CREATE TABLE IF NOT EXISTS chat_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_id UUID REFERENCES chat_configurations(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    test_query TEXT NOT NULL,
    
    -- Test results
    response_time_ms INTEGER,
    generated_response TEXT,
    context_used TEXT,
    search_queries JSONB,
    processing_steps JSONB,
    error_message TEXT,
    
    -- Success metrics
    was_successful BOOLEAN DEFAULT false,
    admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 5),
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO chat_configurations (name, description, is_active, config) VALUES 
('Standard Configuration', 'Default chat response generation configuration', true, '{
    "maxIterations": 3,
    "systemPrompt": "Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig.",
    "vectorSearch": {
        "maxQueries": 3,
        "limit": 10,
        "scoreThreshold": 0.5,
        "useQueryExpansion": true
    },
    "processingSteps": [
        {
            "name": "query_understanding",
            "enabled": true,
            "prompt": "Analysiere die Benutzeranfrage und extrahiere die Kernfrage."
        },
        {
            "name": "context_search",
            "enabled": true,
            "prompt": "Suche relevanten Kontext basierend auf der analysierten Anfrage."
        },
        {
            "name": "context_optimization",
            "enabled": true,
            "prompt": "Optimiere und priorisiere den gefundenen Kontext."
        },
        {
            "name": "response_generation",
            "enabled": true,
            "prompt": "Erstelle eine hilfreiche Antwort basierend auf dem Kontext."
        },
        {
            "name": "response_validation",
            "enabled": false,
            "prompt": "Validiere die Antwort auf Korrektheit und Vollständigkeit."
        }
    ],
    "contextSynthesis": {
        "enabled": true,
        "maxLength": 2000
    },
    "qualityChecks": {
        "enabled": true,
        "minResponseLength": 50,
        "checkForHallucination": true
    }
}');

-- Create indexes
CREATE INDEX idx_chat_configurations_active ON chat_configurations(is_active);
CREATE INDEX idx_chat_test_sessions_created_at ON chat_test_sessions(created_at);
CREATE INDEX idx_chat_test_sessions_config_id ON chat_test_sessions(configuration_id);

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_configurations_updated_at BEFORE UPDATE
    ON chat_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
