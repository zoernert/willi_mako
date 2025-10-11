import { fetch } from 'undici';

interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresAt: string;
  };
}

interface SessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    legacyChatId: string;
  };
}

interface ChatResponse {
  success: boolean;
  data: unknown;
}

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3009';

async function main() {
  const email = process.env.API_V2_TEST_EMAIL;
  const password = process.env.API_V2_TEST_PASSWORD;

  if (!email || !password) {
    console.error('Bitte setze API_V2_TEST_EMAIL und API_V2_TEST_PASSWORD in der Umgebung.');
    process.exit(1);
  }

  console.log('➡️  Hole Token...');
  const authResponse = await fetch(`${baseUrl}/api/v2/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const authPayload = (await authResponse.json()) as AuthResponse;
  if (!authPayload.success) {
    throw new Error(`Token konnte nicht erstellt werden: ${JSON.stringify(authPayload)}`);
  }

  const token = authPayload.data.accessToken;
  console.log('✅ Token erhalten, läuft bis', authPayload.data.expiresAt);

  console.log('➡️  Erstelle Session...');
  const sessionResponse = await fetch(`${baseUrl}/api/v2/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  const sessionPayload = (await sessionResponse.json()) as SessionResponse;
  if (!sessionPayload.success) {
    throw new Error(`Session konnte nicht erstellt werden: ${JSON.stringify(sessionPayload)}`);
  }

  const sessionId = sessionPayload.data.sessionId;
  console.log('✅ Session erstellt:', sessionId, 'LegacyChat:', sessionPayload.data.legacyChatId);

  console.log('➡️  Sende Nachricht...');
  const chatResponse = await fetch(`${baseUrl}/api/v2/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId,
      message: 'Beschreibe den MSCONS Prozess.'
    })
  });

  const chatPayload = (await chatResponse.json()) as ChatResponse;
  if (!chatPayload.success) {
    throw new Error(`Chat fehlgeschlagen: ${JSON.stringify(chatPayload)}`);
  }

  console.log('✅ Antwort erhalten:', JSON.stringify(chatPayload.data, null, 2));
}

main().catch((error) => {
  console.error('❌ Test-Client Fehler:', error);
  process.exit(1);
});
