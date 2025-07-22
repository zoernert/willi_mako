-- Enhanced Logging System Migration
-- Erstellt Tabellen für strukturierte Logs und Performance-Metriken

-- Application Logs Table
CREATE TABLE IF NOT EXISTS application_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    context VARCHAR(100),
    metadata JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    stack TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient log querying
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON application_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_context ON application_logs(context);
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_session_id ON application_logs(session_id);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL, -- in milliseconds
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    context VARCHAR(100),
    metadata JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_label ON performance_metrics(label);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_duration ON performance_metrics(duration);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_context ON performance_metrics(context);

-- Plugin Logs Table (for plugin-specific logging)
CREATE TABLE IF NOT EXISTS plugin_logs (
    id SERIAL PRIMARY KEY,
    plugin_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for plugin logs
CREATE INDEX IF NOT EXISTS idx_plugin_logs_plugin_name ON plugin_logs(plugin_name);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_event_type ON plugin_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_timestamp ON plugin_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_level ON plugin_logs(level);

-- Log retention policy function
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Delete logs older than 30 days
    DELETE FROM application_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete performance metrics older than 7 days
    DELETE FROM performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    -- Delete plugin logs older than 14 days
    DELETE FROM plugin_logs 
    WHERE timestamp < NOW() - INTERVAL '14 days';
    
    -- Vacuum tables to reclaim space
    VACUUM ANALYZE application_logs;
    VACUUM ANALYZE performance_metrics;
    VACUUM ANALYZE plugin_logs;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT cleanup_old_logs();');

-- Log statistics view
CREATE OR REPLACE VIEW log_statistics AS
SELECT 
    DATE(timestamp) as date,
    level,
    context,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM application_logs 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), level, context
ORDER BY date DESC, count DESC;

-- Performance metrics summary view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    label,
    COUNT(*) as total_executions,
    AVG(duration) as avg_duration,
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration
FROM performance_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY label
ORDER BY avg_duration DESC;

-- Plugin activity summary view
CREATE OR REPLACE VIEW plugin_activity AS
SELECT 
    plugin_name,
    event_type,
    level,
    COUNT(*) as event_count,
    MAX(timestamp) as last_activity
FROM plugin_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY plugin_name, event_type, level
ORDER BY plugin_name, event_count DESC;
