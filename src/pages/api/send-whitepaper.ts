import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../services/emailService';
import type { WhitepaperLeadData } from '../../types/whitepaper-lead';

interface SendWhitepaperRequest extends NextApiRequest {
  body: WhitepaperLeadData;
}

export default async function handler(req: SendWhitepaperRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { 
      email, 
      whitepaperTitle, 
      whitepaperPdfUrl,
      downloadReasons,
      usagePurpose,
      contactPreferences 
    } = req.body;

    // Validation
    if (!email || !whitepaperTitle || !whitepaperPdfUrl) {
      return res.status(400).json({ error: 'Fehlende Parameter: E-Mail, Whitepaper-Titel oder PDF-URL.' });
    }

    if (!downloadReasons || downloadReasons.length === 0) {
      return res.status(400).json({ error: 'Bitte geben Sie mindestens einen Download-Grund an.' });
    }

    if (!usagePurpose) {
      return res.status(400).json({ error: 'Bitte geben Sie den Nutzungszweck an.' });
    }

    if (!contactPreferences || contactPreferences.length === 0) {
      return res.status(400).json({ error: 'Bitte geben Sie mindestens eine Kontaktpräferenz an.' });
    }

    try {
      const emailService = new EmailService();
      const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://stromhaltig.de'}${whitepaperPdfUrl}`;

      // 1) Internal Lead Email to STROMDAO
      await emailService.sendEmail({
        to: 'dev@stromdao.com',
        subject: `Qualifizierter Whitepaper-Lead: ${whitepaperTitle}`,
        replyTo: email,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #147a50;">Neuer qualifizierter Whitepaper-Lead</h1>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Lead-Informationen</h2>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Whitepaper:</strong> ${whitepaperTitle}</p>
              <p><strong>Download-Link:</strong> <a href="${downloadUrl}">${downloadUrl}</a></p>
            </div>

            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Qualifizierungsdaten</h2>
              
              <h3 style="color: #147a50; font-size: 16px;">Download-Gründe:</h3>
              <ul>
                ${downloadReasons.map((reason: string) => `<li>${reason}</li>`).join('')}
              </ul>

              <h3 style="color: #147a50; font-size: 16px;">Nutzungszweck:</h3>
              <p>${usagePurpose}</p>

              <h3 style="color: #147a50; font-size: 16px;">Gewünschte Kontaktaufnahme:</h3>
              <ul>
                ${contactPreferences.map((pref: string) => `<li>${pref}</li>`).join('')}
              </ul>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666;">
                Diese Lead-Informationen wurden automatisch über das Whitepaper-Download-Formular erfasst.
                Bitte kontaktieren Sie den Interessenten entsprechend seiner Präferenzen.
              </p>
            </div>
          </div>
        `,
      });

      // 2) Confirmation Email to Prospect with Download Link
      await emailService.sendEmail({
        to: email,
        subject: `Ihr Whitepaper: ${whitepaperTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #147a50;">Vielen Dank für Ihr Interesse!</h1>
            
            <p>Sehr geehrte Damen und Herren,</p>
            
            <p>vielen Dank für Ihr Interesse an unserem Whitepaper <strong>"${whitepaperTitle}"</strong>.</p>

            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <h2 style="color: #147a50; margin-top: 0;">Ihr Download</h2>
              <a href="${downloadUrl}" 
                 style="display: inline-block; background-color: #147a50; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
                Whitepaper jetzt herunterladen (PDF)
              </a>
              <p style="font-size: 12px; color: #666; margin-top: 15px;">
                Der Download-Link ist unbegrenzt gültig.
              </p>
            </div>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Kontaktieren Sie uns</h2>
              <p>
                Haben Sie Fragen zum Whitepaper oder möchten Sie mehr über unsere Lösungen erfahren? 
                Wir freuen uns auf Ihre Kontaktaufnahme!
              </p>
              
              <h3 style="color: #147a50; font-size: 16px;">STROMDAO GmbH</h3>
              <p style="margin: 5px 0;">
                <strong>E-Mail:</strong> <a href="mailto:kontakt@stromdao.com" style="color: #147a50;">kontakt@stromdao.com</a><br>
                <strong>Telefon:</strong> +49 (0) 6226 968 00 0<br>
                <strong>Web:</strong> <a href="https://stromdao.de" style="color: #147a50;">stromdao.de</a>
              </p>

              <p style="margin-top: 20px; font-size: 14px;">
                Gemäß Ihrer Angaben werden wir Sie wie gewünscht kontaktieren:
              </p>
              <ul style="margin: 10px 0;">
                ${contactPreferences.map((pref: string) => `<li>${pref}</li>`).join('')}
              </ul>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666;">
                Mit freundlichen Grüßen<br>
                Ihr Team der STROMDAO GmbH
              </p>
              <p style="font-size: 11px; color: #999; margin-top: 20px;">
                STROMDAO GmbH | Gerhard-Koch-Straße 2+4 | 73760 Ostfildern<br>
                Handelsregister: HRB 728691 (Amtsgericht Stuttgart) | Geschäftsführer: Thorsten Zoerner
              </p>
            </div>
          </div>
        `,
      });

      return res.status(200).json({ 
        message: 'Vielen Dank! Sie erhalten in Kürze eine E-Mail mit dem Download-Link.' 
      });
    } catch (error) {
      console.error('Fehler beim Senden der Whitepaper-E-Mails:', error);
      return res.status(500).json({ error: 'Fehler beim Senden des Whitepapers.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
