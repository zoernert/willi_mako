-- Wissens-Challenge Gamification Schema Migration
-- Erstellt: 2025-07-18

-- Quizzes Tabelle
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    topic_area VARCHAR(100),
    time_limit_minutes INTEGER DEFAULT 10,
    question_count INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz-Fragen Tabelle
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice',
    correct_answer_index INTEGER,
    answer_options JSONB NOT NULL, -- Array von Antwortmöglichkeiten
    explanation TEXT,
    difficulty_level VARCHAR(20),
    points INTEGER DEFAULT 10,
    source_faq_id UUID REFERENCES faqs(id),
    source_chat_id UUID REFERENCES chats(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benutzer Quiz-Versuche
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    score INTEGER DEFAULT 0,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    time_spent_seconds INTEGER,
    is_completed BOOLEAN DEFAULT false,
    answers JSONB, -- Speichert Benutzerantworten
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gamification Punkte-System
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    source_type VARCHAR(50), -- 'quiz', 'chat', 'faq_creation', etc.
    source_id UUID,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255)
);

-- Expertenstatus
CREATE TABLE IF NOT EXISTS user_expertise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_area VARCHAR(100) NOT NULL,
    expertise_level VARCHAR(20) DEFAULT 'beginner',
    points_in_topic INTEGER DEFAULT 0,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_area)
);

-- Bestenliste/Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    total_points INTEGER DEFAULT 0,
    quiz_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_visible BOOLEAN DEFAULT false
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_id ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_quiz_id ON user_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_expertise_user_topic ON user_expertise(user_id, topic_area);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);

-- Trigger für updated_at bei quizzes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
