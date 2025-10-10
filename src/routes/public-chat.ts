import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import pool from '../config/database';

const router = Router();

const isShareEnabled = (metadata: any): boolean => {
  if (!metadata) {
    return false;
  }

  const shareFlag = metadata.share_enabled ?? metadata.shareEnabled;
  if (typeof shareFlag === 'string') {
    return shareFlag.toLowerCase() === 'true';
  }

  return Boolean(shareFlag);
};

router.get('/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chatResult = await pool.query(
    'SELECT id, title, created_at, updated_at, metadata FROM chats WHERE id = $1 AND is_active = true',
    [chatId]
  );

  if (chatResult.rows.length === 0) {
    throw new AppError('Chat not found', 404);
  }

  const chat = chatResult.rows[0];

  if (!isShareEnabled(chat.metadata)) {
    throw new AppError('Chat not found', 404);
  }

  const messagesResult = await pool.query(
    `SELECT id, role, content, created_at
     FROM messages
     WHERE chat_id = $1
     ORDER BY created_at ASC`,
    [chatId]
  );

  res.json({
    success: true,
    data: {
      chat: {
        id: chat.id,
        title: chat.title,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
      },
      messages: messagesResult.rows,
    },
  });
}));

export default router;
