import pool from '../../config/database';

let ensureColumnsPromise: Promise<void> | null = null;
let columnsEnsured = false;

const columnDefinitions: Array<{
  name: string;
  createStatement: string;
  postCreateStatement?: string;
}> = [
  {
    name: 'metadata',
    createStatement: "ALTER TABLE chats ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb",
    postCreateStatement: "UPDATE chats SET metadata = '{}'::jsonb WHERE metadata IS NULL",
  },
  {
    name: 'is_active',
    createStatement: 'ALTER TABLE chats ADD COLUMN is_active BOOLEAN DEFAULT true',
    postCreateStatement: 'UPDATE chats SET is_active = true WHERE is_active IS NULL',
  },
];

export const ensureChatColumns = async (): Promise<void> => {
  if (columnsEnsured) {
    return;
  }

  if (!ensureColumnsPromise) {
    ensureColumnsPromise = (async () => {
      for (const column of columnDefinitions) {
        const result = await pool.query(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'chats'
             AND column_name = $1`,
          [column.name]
        );

        if (result.rowCount === 0) {
          await pool.query(column.createStatement);
          if (column.postCreateStatement) {
            await pool.query(column.postCreateStatement);
          }
        }
      }

      columnsEnsured = true;
    })().catch((error) => {
      ensureColumnsPromise = null;
      console.error('Failed to ensure chats table columns:', error);
      throw error;
    });
  }

  return ensureColumnsPromise;
};
