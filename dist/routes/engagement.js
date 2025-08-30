"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../utils/database");
const emailService_1 = require("../services/emailService");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const systemSettingsService_1 = require("../services/systemSettingsService");
const router = (0, express_1.Router)();
// Utility to build branded email HTML matching app style
function baseEmailLayout(title, contentHtml) {
    const logoUrl = 'https://stromhaltig.de/logo.png';
    return `
  <!DOCTYPE html>
  <html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body{font-family: Inter, Arial, sans-serif; background:#f6f7f9; margin:0; padding:0;}
      .container{max-width:640px;margin:0 auto;padding:24px;}
      .card{background:#ffffff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.06);overflow:hidden;border:1px solid #eef0f3}
      .header{background:linear-gradient(135deg,#147a50 0%,#1db074 100%);color:#fff;padding:24px;text-align:center}
      .brand{display:flex;align-items:center;justify-content:center;gap:12px}
      .brand img{height:28px}
      h1{margin:0;font-size:22px}
      .content{padding:24px;color:#203040}
      .cta{display:inline-block;background:#147a50;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600}
      .star{display:inline-block;margin:8px 6px;text-decoration:none}
      .star a{display:inline-block;background:#f3f6fb;border:1px solid #e3e9f2;color:#0f1f2e;padding:10px 14px;border-radius:10px;font-weight:600}
      .footer{padding:16px 24px;color:#6b7a90;font-size:12px;text-align:center;border-top:1px solid #eef0f3}
      textarea{width:100%;padding:10px;border:1px solid #e3e9f2;border-radius:10px;min-height:100px;font-family:inherit}
      .hint{color:#6b7a90;font-size:12px;margin-top:6px}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="header">
          <div class="brand">
            <img src="${logoUrl}" alt="Willi Mako" />
            <h1>${title}</h1>
          </div>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">© ${new Date().getFullYear()} Willi Mako • stromhaltig.de</div>
      </div>
    </div>
  </body>
  </html>`;
}
function makeStarLinks(baseUrl, params) {
    const rows = [];
    for (let i = 1; i <= 5; i++) {
        const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), stars: String(i) }).toString();
        rows.push(`<span class="star"><a href="${baseUrl}?${q}">★ ${i}</a></span>`);
    }
    return `<div>${rows.join('')}</div>`;
}
function escapeHtml(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// Public endpoints to capture feedback (no auth required)
router.get('/public/feedback', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId, type, chatId, stars, useful } = req.query;
    if (!userId || !type || !stars) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }
    const starsNum = parseInt(String(stars), 10);
    if (isNaN(starsNum) || starsNum < 1 || starsNum > 5) {
        return res.status(400).json({ success: false, message: 'Invalid stars value' });
    }
    const usefulVal = typeof useful !== 'undefined' ? String(useful) === 'true' : null;
    const inserted = await database_1.DatabaseHelper.executeQuerySingle(`INSERT INTO engagement_feedback (user_id, type, chat_id, stars, useful, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [userId, type, chatId || null, starsNum, usefulVal, req.headers['user-agent'] || null, req.ip]);
    // Optional: update status of engagement email when feedback given
    await database_1.DatabaseHelper.executeQuery(`UPDATE engagement_emails SET status = 'responded' WHERE user_id = $1 AND type = $2 AND (chat_id IS NOT DISTINCT FROM $3)`, [userId, type, chatId || null]);
    // Branded thank you page with comment form
    const starVisual = '★'.repeat(starsNum) + '☆'.repeat(5 - starsNum);
    const frontendUrl = await systemSettingsService_1.SystemSettingsService.getSetting('system.frontend_url', 'https://stromhaltig.de');
    const content = `
    <h2>Danke für die Rückmeldung</h2>
    <p>Ihre Bewertung (${starVisual}) wurde gespeichert.</p>
    ${usefulVal !== null ? `<p>Nützlichkeit: <strong>${usefulVal ? 'Ja' : 'Nein'}</strong></p>` : ''}
    <form action="/api/engagement/public/feedback" method="POST" style="margin-top:16px">
      <input type="hidden" name="feedbackId" value="${(inserted === null || inserted === void 0 ? void 0 : inserted.id) || ''}" />
      <input type="hidden" name="userId" value="${String(userId)}" />
      <input type="hidden" name="type" value="${String(type)}" />
      ${chatId ? `<input type="hidden" name="chatId" value="${String(chatId)}" />` : ''}
      <input type="hidden" name="stars" value="${starsNum}" />
      ${usefulVal !== null ? `<input type="hidden" name="useful" value="${usefulVal}" />` : ''}
      <label for="comment"><strong>Möchten Sie uns noch einen Kommentar hinterlassen?</strong></label>
      <textarea id="comment" name="comment" placeholder="Ihr Kommentar (optional)"></textarea>
      <div class="hint">Ihre Hinweise helfen uns, Willi Mako weiter zu verbessern.</div>
      <div style="margin-top:12px">
        <button type="submit" class="cta">Kommentar senden</button>
        <a class="cta" style="background:#9aa6b2;margin-left:8px" href="${frontendUrl}/app">Zurück zur App</a>
      </div>
    </form>
  `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(baseEmailLayout('Vielen Dank', content));
}));
// Public: accept optional comment via POST (form submit)
router.post('/public/feedback', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { feedbackId, userId, type, chatId, stars, useful, comment } = req.body;
    // Basic validation
    if (!userId || !type) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
    }
    const sanitizedComment = typeof comment === 'string' ? comment.trim() : '';
    if (sanitizedComment && sanitizedComment.length > 2000) {
        return res.status(400).json({ success: false, message: 'Kommentar zu lang' });
    }
    // If feedbackId present, update that row, otherwise update the latest matching row
    if (sanitizedComment) {
        if (feedbackId) {
            await database_1.DatabaseHelper.executeQuery(`UPDATE engagement_feedback SET comment = $1 WHERE id = $2`, [sanitizedComment, feedbackId]);
        }
        else {
            await database_1.DatabaseHelper.executeQuery(`UPDATE engagement_feedback SET comment = $1 
         WHERE id = (
           SELECT id FROM engagement_feedback 
           WHERE user_id = $2 AND type = $3 AND (chat_id IS NOT DISTINCT FROM $4)
           ORDER BY created_at DESC LIMIT 1
         )`, [sanitizedComment, userId, type, chatId || null]);
        }
    }
    const starsNum = stars ? parseInt(String(stars), 10) : null;
    const usefulVal = typeof useful !== 'undefined' && useful !== null ? String(useful) === 'true' : null;
    const frontendUrl = await systemSettingsService_1.SystemSettingsService.getSetting('system.frontend_url', 'https://stromhaltig.de');
    const starVisual = starsNum ? ('★'.repeat(starsNum) + '☆'.repeat(5 - starsNum)) : '';
    const content = `
    <h2>Danke für die Rückmeldung</h2>
    ${starVisual ? `<p>Ihre Bewertung (${starVisual}) wurde gespeichert.</p>` : ''}
    ${usefulVal !== null ? `<p>Nützlichkeit: <strong>${usefulVal ? 'Ja' : 'Nein'}</strong></p>` : ''}
    ${sanitizedComment ? `<p><strong>Ihr Kommentar:</strong><br/>${escapeHtml(sanitizedComment)}</p>` : '<p>Vielen Dank!</p>'}
    <p><a class="cta" href="${frontendUrl}/app">Zurück zu Willi Mako</a></p>
  `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(baseEmailLayout('Danke für die Rückmeldung', content));
}));
// Admin: send engagement mail to a user
router.post('/admin/engagement/send', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin')
        return res.status(403).json({ success: false, message: 'Forbidden' });
    // Feature flag check
    const enabled = await systemSettingsService_1.SystemSettingsService.getSetting('engagement.enabled', true);
    if (!enabled) {
        return res.status(503).json({ success: false, message: 'Engagement emails disabled' });
    }
    const { userId, type, chatId } = req.body;
    if (!userId || !type)
        return res.status(400).json({ success: false, message: 'Missing userId or type' });
    if (type === 'chat_feedback' && !chatId)
        return res.status(400).json({ success: false, message: 'chatId required for chat_feedback' });
    // Resolve user info
    const user = await database_1.DatabaseHelper.executeQuerySingle('SELECT id, email, full_name FROM users WHERE id = $1', [userId]);
    if (!user)
        return res.status(404).json({ success: false, message: 'User not found' });
    // If chat_feedback, verify the chat belongs to the user
    if (type === 'chat_feedback' && chatId) {
        const chat = await database_1.DatabaseHelper.executeQuerySingle('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, user.id]);
        if (!chat)
            return res.status(400).json({ success: false, message: 'Chat not found for user' });
    }
    // Check if already sent (unique constraint also protects)
    const already = await database_1.DatabaseHelper.executeQuerySingle('SELECT id FROM engagement_emails WHERE user_id=$1 AND type=$2 AND (chat_id IS NOT DISTINCT FROM $3)', [user.id, type, chatId || null]);
    if (already) {
        return res.status(409).json({ success: false, message: 'Mail dieses Typs wurde bereits gesendet' });
    }
    // Determine base URL from settings or env
    const frontendUrl = await systemSettingsService_1.SystemSettingsService.getSetting('system.frontend_url', process.env.FRONTEND_URL || 'https://stromhaltig.de');
    const baseUrl = `${frontendUrl}/api/engagement/public/feedback`;
    let subject = '';
    let html = '';
    if (type === 'layout_feedback') {
        subject = 'Ihre Meinung zum Layout von Willi Mako';
        const body = `
      <p>Hallo ${user.full_name || ''},</p>
      <p>wir arbeiten ständig daran, die Anwendung zu verbessern. Wie gefällt Ihnen das aktuelle Layout?</p>
      <p>Bitte vergeben Sie 1-5 Sterne:</p>
      ${makeStarLinks(baseUrl, { userId: user.id, type: 'layout_feedback' })}
      <hr/>
      <p><strong>Warum Willi Mako?</strong></p>
      <ul>
        <li>KI-gestützter Chat für schnelle Antworten zu Marktkommunikation</li>
        <li>Gezielte Quizze zum Vertiefen des Wissens</li>
        <li>Community-Austausch und gemeinsame Lernfortschritte</li>
      </ul>
      <p>Probieren Sie den Chat gleich aus: <a href="${frontendUrl}/app/chat">Zum Chat</a></p>
    `;
        html = baseEmailLayout('Feedback zum Layout', body);
    }
    else {
        subject = 'War dieser Chat hilfreich? Bitte bewerten';
        const body = `
      <p>Hallo ${user.full_name || ''},</p>
      <p>bitte bewerten Sie Ihren Chat und ob die erhaltene Antwort nützlich war.</p>
      <p>Vergabe 1-5 Sterne:</p>
      ${makeStarLinks(baseUrl, { userId: user.id, type: 'chat_feedback', chatId: chatId || '' })}
      <p>War die Antwort nützlich?</p>
      <div>
        <a class="cta" href="${baseUrl}?${new URLSearchParams({ userId: user.id, type: 'chat_feedback', chatId: chatId || '', stars: '5', useful: 'true' }).toString()}">Ja, nützlich</a>
        &nbsp;
        <a class="cta" style="background:#9aa6b2" href="${baseUrl}?${new URLSearchParams({ userId: user.id, type: 'chat_feedback', chatId: chatId || '', stars: '3', useful: 'false' }).toString()}">Eher nicht</a>
      </div>
      <hr/>
      <p><strong>Hinweis:</strong> Ihre Rückmeldung hilft uns, die Qualität von Willi Mako zu verbessern.</p>
    `;
        html = baseEmailLayout('Chat bewerten', body);
    }
    // Send via existing SMTP/SES settings and capture messageId
    const sendInfo = await emailService_1.emailService.sendEmailWithInfo({ to: user.email, subject, html });
    const rec = await database_1.DatabaseHelper.executeQuerySingle('INSERT INTO engagement_emails (user_id, type, chat_id, subject, message_id, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [user.id, type, chatId || null, subject, (sendInfo === null || sendInfo === void 0 ? void 0 : sendInfo.messageId) || null, 'sent']);
    res.json({ success: true, id: rec === null || rec === void 0 ? void 0 : rec.id, messageId: sendInfo === null || sendInfo === void 0 ? void 0 : sendInfo.messageId });
}));
// Admin: list engagement status for a user (include latest feedback)
router.get('/admin/engagement/:userId', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin')
        return res.status(403).json({ success: false, message: 'Forbidden' });
    const { userId } = req.params;
    const rows = await database_1.DatabaseHelper.executeQuery(`SELECT e.id, e.type, e.chat_id, e.status, e.sent_at,
            (
              SELECT row_to_json(x) FROM (
                SELECT ef.stars, ef.useful, ef.comment, ef.created_at AS feedback_at
                FROM engagement_feedback ef
                WHERE ef.user_id = e.user_id
                  AND ef.type = e.type
                  AND (ef.chat_id IS NOT DISTINCT FROM e.chat_id)
                ORDER BY ef.created_at DESC
                LIMIT 1
              ) x
            ) AS feedback
     FROM engagement_emails e
     WHERE e.user_id=$1
     ORDER BY e.sent_at DESC`, [userId]);
    res.json({ success: true, items: rows });
}));
exports.default = router;
//# sourceMappingURL=engagement.js.map