import { AppError } from '../../middleware/errorHandler';

interface ChatParityRequest {
  sessionId: string;
  message: string;
  chatId: string;
  contextSettings?: Record<string, any>;
  timelineId?: string;
}

interface ChatParityResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export class ChatParityService {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const port = process.env.PORT || '3009';
    this.baseUrl = baseUrl || process.env.API_V2_PARITY_BASE_URL || `http://127.0.0.1:${port}`;
  }

  public async forwardChat<T = any>(
    request: ChatParityRequest,
    authorization: string | undefined,
    signal?: AbortSignal
  ): Promise<T> {
    if (!authorization) {
      throw new AppError('Authorization Header fehlt', 401);
    }

  let response: any;
    try {
      response = await fetch(`${this.baseUrl}/api/chat/chats/${encodeURIComponent(request.chatId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
          'x-session-id': request.sessionId
        },
        body: JSON.stringify({
          content: request.message,
          sessionId: request.sessionId,
          contextSettings: request.contextSettings,
          timelineId: request.timelineId
        }),
        signal
      });
    } catch (error: any) {
      throw new AppError(error?.message || 'Chat-Parität: Anfrage fehlgeschlagen', 502);
    }

    const payload = (await response.json().catch(() => null)) as ChatParityResponse<T> | null;

    if (!response.ok || !payload || payload.success !== true) {
      throw new AppError(payload?.error?.message || 'Chat-Parität fehlgeschlagen', response.status || 502);
    }

    return payload.data as T;
  }
}

export const chatParityService = new ChatParityService();
