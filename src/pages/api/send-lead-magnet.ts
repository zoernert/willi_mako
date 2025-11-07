import type { NextApiRequest, NextApiResponse } from 'next';
import { emailService } from '../../services/emailService';

interface LeadMagnetRequest {
  email: string;
  magnetType: string;
  magnetTitle: string;
  pdfPath: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, magnetType, magnetTitle, pdfPath }: LeadMagnetRequest = req.body;

    if (!email || !magnetType || !magnetTitle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Download-URL generieren
    const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://stromhaltig.de'}${pdfPath}`;

    // Email mit Lead-Magnet versenden
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${magnetTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1976d2; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Hier ist deine ${magnetTitle}!</h1>
  </div>
  
  <div style="background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Vielen Dank für dein Interesse! 🎉</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${downloadUrl}" 
         style="background-color: #1976d2; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        📥 Jetzt herunterladen
      </a>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin-top: 30px;">
      <h3 style="color: #1976d2; margin-top: 0;">🎁 Bonus: Die 5 häufigsten GPKE-Fehler</h3>
      <p>In 3 Tagen erhältst du eine weitere E-Mail mit den 5 häufigsten Fehlern bei GPKE-Prozessen und wie du sie vermeidest.</p>
      <a href="https://stromhaltig.de/wissen/artikel/gpke-fehler" style="color: #1976d2; text-decoration: none;">
        → Artikel jetzt schon lesen
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <h3 style="color: #333;">💬 Was ist deine größte Herausforderung?</h3>
    <p>Antworte einfach auf diese E-Mail – ich lese jede Antwort persönlich und helfe gerne weiter.</p>
    
    <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin-top: 30px;">
      <h3 style="margin-top: 0; color: #2e7d32;">🤖 Automatisiere deine GPKE-Fristen</h3>
      <p style="margin-bottom: 15px;">Wusstest du, dass Willi-Mako automatisch alle GPKE-Fristen überwacht und dich rechtzeitig warnt?</p>
      <ul style="margin: 15px 0; padding-left: 20px;">
        <li>Automatische Fristen-Tracker</li>
        <li>EDIFACT-Validierung</li>
        <li>APERAK-Fehler sofort erklärt</li>
        <li>70% Zeitersparnis</li>
      </ul>
      <a href="https://stromhaltig.de/app/register?utm_source=email&utm_campaign=gpke-checklist" 
         style="background-color: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 10px;">
        → 14 Tage kostenlos testen
      </a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
      <p><strong>STROMDAO GmbH / Willi-Mako</strong><br>
      Dein AI-Coach für Marktkommunikation</p>
      <p style="margin-top: 15px;">
        <a href="https://stromhaltig.de" style="color: #1976d2; text-decoration: none;">Website</a> | 
        <a href="https://training.stromhaltig.de" style="color: #1976d2; text-decoration: none;">Training</a> | 
        <a href="mailto:support@stromhaltig.de" style="color: #1976d2; text-decoration: none;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await emailService.sendEmail({
      to: email,
      subject: `Hier ist deine ${magnetTitle} [+ Bonus]`,
      html: htmlContent,
      replyTo: 'support@stromhaltig.de'
    });

    // Lead in Datenbank speichern (wenn DB-Tabelle existiert)
    // TODO: Implement database storage when table is created
    // await db.query(`
    //   INSERT INTO lead_magnet_downloads (email, magnet_type, utm_source, utm_campaign)
    //   VALUES ($1, $2, $3, $4)
    // `, [email, magnetType, req.query.utm_source, req.query.utm_campaign]);

    // Erfolg loggen
    console.log(`[Lead-Magnet] ${magnetType} sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Lead-Magnet wurde erfolgreich versendet'
    });

  } catch (error) {
    console.error('[Lead-Magnet] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Lead-Magnet konnte nicht versendet werden'
    });
  }
}
