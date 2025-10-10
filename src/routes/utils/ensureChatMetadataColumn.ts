import pool from '../../config/database';

let ensureMetadataColumnPromise: Promise<void> | null = null;
let metadataColumnAvailable = false;

export const ensureChatMetadataColumn = async (): Promise<void> => {
  if (metadataColumnAvailable) {
    return;
  }

  if (!ensureMetadataColumnPromise) {
    ensureMetadataColumnPromise = (async () => {
      const result = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'chats'
           AND column_name = 'metadata'`
      );

      if (result.rowCount === 0) {
        await pool.query("ALTER TABLE chats ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb");
        await pool.query("UPDATE chats SET metadata = '{}'::jsonb WHERE metadata IS NULL");
      }

      metadataColumnAvailable = true;
    })().catch((error) => {
      ensureMetadataColumnPromise = null;
      console.error('Failed to ensure chats.metadata column exists:', error);
      throw error;
    });
  }

  return ensureMetadataColumnPromise;
};
