-- Datenbank-Initialisierung für Willi Mako
-- Vollständiges Schema für FAQ-System mit Chat-Funktionalität

-- Erweiterungen aktivieren
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Benutzer-Tabelle
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FAQs-Tabelle
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    context TEXT NOT NULL,
    answer TEXT NOT NULL,
    additional_info TEXT,
    tags JSONB DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chats-Tabelle
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    faq_id UUID REFERENCES faqs(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages-Tabelle
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dokumente-Tabelle (für File-Upload)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    file_path VARCHAR(500),
    processed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vektor-Embeddings Tabelle (für Qdrant-Synchronisation)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding_vector JSONB,
    qdrant_point_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT embeddings_source_check CHECK (
        (document_id IS NOT NULL AND faq_id IS NULL) OR 
        (document_id IS NULL AND faq_id IS NOT NULL)
    )
);

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_faqs_created_at ON faqs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faqs_tags ON faqs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faqs_view_count ON faqs(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_faq_id ON chats(faq_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_faq_id ON embeddings(faq_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_qdrant_point_id ON embeddings(qdrant_point_id);

-- Trigger für updated_at Spalten
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Beispiel-Daten für Demo-Zwecke
INSERT INTO users (id, email, password_hash, name, role) VALUES 
(uuid_generate_v4(), 'admin@willimako.com', '$2a$12$yKLbo5Go3FOIcsKvFZNoCu2c6WgHmNyHqRK4MByrAYT45QgwFDwli', 'Admin User', 'admin'),
(uuid_generate_v4(), 'user@willimako.com', '$2a$12$g.04qKkbtSyWWPQ8Y3lD4e8bdqIAUhO22Rkw.1bzBtfv9UPtfg3JK', 'Test User', 'user')
ON CONFLICT (email) DO NOTHING;

-- Beispiel-FAQs
INSERT INTO faqs (id, title, description, context, answer, additional_info, tags) VALUES 
(
    uuid_generate_v4(),
    'Was ist Willi Mako?',
    'Allgemeine Informationen über Willi Mako',
    'Benutzer möchte grundlegende Informationen über das System',
    'Willi Mako ist ein intelligentes FAQ-System mit KI-gestützter Chat-Funktionalität. Es hilft dabei, häufig gestellte Fragen zu beantworten und bietet eine intuitive Benutzeroberfläche für die Interaktion mit Dokumenten und Wissensdatenbanken.',
    'Das System nutzt moderne KI-Technologien für eine natürliche Sprachverarbeitung.',
    '["allgemein", "system", "info"]'
),
(
    uuid_generate_v4(),
    'Wie kann ich Dokumente hochladen?',
    'Anleitung zum Hochladen von Dokumenten',
    'Benutzer möchte wissen, wie Dokumente in das System geladen werden können',
    'Sie können Dokumente über die Dokumente-Seite hochladen. Klicken Sie auf "Dokument hinzufügen", wählen Sie Ihre Datei aus und bestätigen Sie den Upload. Das System unterstützt verschiedene Dateiformate wie PDF, DOC, TXT.',
    'Maximale Dateigröße: 50MB. Unterstützte Formate: PDF, DOC, DOCX, TXT, MD',
    '["dokumente", "upload", "dateien"]'
),
(
    uuid_generate_v4(),
    'Wie funktioniert die Chat-Funktion?',
    'Erklärung der Chat-Funktionalität',
    'Benutzer möchte verstehen, wie die Chat-Funktion arbeitet',
    'Die Chat-Funktion ermöglicht es Ihnen, direkt mit dem KI-Assistenten zu kommunizieren. Sie können Fragen stellen, und das System durchsucht die Wissensdatenbank nach relevanten Informationen. Jeder Chat wird gespeichert und kann später fortgesetzt werden.',
    'Der Chat nutzt fortschrittliche KI-Modelle für natürliche Sprachverarbeitung.',
    '["chat", "ki", "kommunikation"]'
)
ON CONFLICT (id) DO NOTHING;

-- Volltext-Suche Konfiguration
CREATE INDEX IF NOT EXISTS idx_faqs_fulltext ON faqs USING gin(
    to_tsvector('german', title || ' ' || description || ' ' || answer)
);

CREATE INDEX IF NOT EXISTS idx_documents_fulltext ON documents USING gin(
    to_tsvector('german', filename || ' ' || original_name)
);

-- Statistiken aktualisieren
ANALYZE users;
ANALYZE faqs;
ANALYZE chats;
ANALYZE messages;
ANALYZE documents;
ANALYZE embeddings;

-- Abschlussmeldung
DO $$
BEGIN
    RAISE NOTICE 'Willi Mako Datenbank erfolgreich initialisiert!';
    RAISE NOTICE 'Tabellen erstellt: users, faqs, chats, messages, documents, embeddings';
    RAISE NOTICE 'Indizes und Trigger konfiguriert';
    RAISE NOTICE 'Beispiel-Daten eingefügt';
END
$$;
