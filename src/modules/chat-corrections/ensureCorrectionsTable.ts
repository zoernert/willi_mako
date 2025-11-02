import pool from '../../config/database';

let ensurePromise: Promise<void> | null = null;
let ensured = false;

const TABLE_NAME = 'chat_correction_suggestions';

const columnDefinitions: Array<{ name: string; definition: string }> = [
  { name: 'original_question', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN original_question TEXT' },
  { name: 'assistant_response', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN assistant_response TEXT' },
  { name: 'corrected_information', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN corrected_information TEXT' },
  { name: 'correction_summary', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN correction_summary TEXT' },
  { name: 'vector_title', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN vector_title TEXT' },
  { name: 'vector_suggestion', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN vector_suggestion TEXT' },
  { name: 'confidence', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN confidence NUMERIC(4,3)' },
  { name: 'severity', definition: "ALTER TABLE chat_correction_suggestions ADD COLUMN severity TEXT DEFAULT 'low'" },
  { name: 'detection_reason', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN detection_reason TEXT' },
  { name: 'tags', definition: "ALTER TABLE chat_correction_suggestions ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::text[]" },
  { name: 'metadata', definition: "ALTER TABLE chat_correction_suggestions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb" },
  { name: 'conversation_snapshot', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN conversation_snapshot JSONB' },
  { name: 'review_notes', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN review_notes TEXT' },
  { name: 'reviewed_by', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL' },
  { name: 'reviewed_at', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN reviewed_at TIMESTAMPTZ' },
  { name: 'vector_point_id', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN vector_point_id TEXT' },
  { name: 'vector_payload', definition: "ALTER TABLE chat_correction_suggestions ADD COLUMN vector_payload JSONB DEFAULT '{}'::jsonb" },
  { name: 'updated_at', definition: 'ALTER TABLE chat_correction_suggestions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()' }
];

async function ensureTable(): Promise<void> {
  const existsRes = await pool.query(
    `SELECT to_regclass('public.${TABLE_NAME}') as table_id`
  );

  if (!existsRes.rows[0]?.table_id) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assistant_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        user_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        correction_text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_status ON ${TABLE_NAME} (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_created_at ON ${TABLE_NAME} (created_at DESC)`);
  }

  for (const column of columnDefinitions) {
    const columnExists = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [TABLE_NAME, column.name]
    );

    if (columnExists.rowCount === 0) {
      await pool.query(column.definition);
    }
  }

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_${TABLE_NAME}_updated_at'
      ) THEN
        CREATE TRIGGER update_${TABLE_NAME}_updated_at
        BEFORE UPDATE ON ${TABLE_NAME}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END;
    $$;
  `);

  ensured = true;
}

export async function ensureCorrectionsTable(): Promise<void> {
  if (ensured) {
    return;
  }

  if (!ensurePromise) {
    ensurePromise = ensureTable().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
