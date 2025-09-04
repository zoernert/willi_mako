import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../services/emailService';

interface SendWhitepaperRequest extends NextApiRequest {
  body: {
    email: string;
    whitepaperTitle: string;
    whitepaperPdfUrl: string;
  };
}

export default async function handler(req: SendWhitepaperRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
  const { email, whitepaperTitle, whitepaperPdfUrl } = req.body;

    if (!email || !whitepaperTitle || !whitepaperPdfUrl) {
      return res.status(400).json({ error: 'Fehlende Parameter: E-Mail, Whitepaper-Titel oder PDF-URL.' });
    }

    try {
      const emailService = new EmailService();

      // 1) Interne Lead-Mail – use default verified sender; route replies to the prospect
      await emailService.sendEmail({
        to: 'dev@stromdao.com',
        subject: `Whitepaper-Lead: ${whitepaperTitle}`,
        replyTo: email,
        html: `
          <h1>Neuer Whitepaper-Lead</h1>
          <p><strong>Whitepaper:</strong> ${whitepaperTitle}</p>
          <p><strong>Interessent (E-Mail):</strong> ${email}</p>
          <p><strong>Download-Link (PDF):</strong> <a href="${whitepaperPdfUrl}">${whitepaperPdfUrl}</a></p>
          <hr/>
          <p>Hinweis: Nachgelagerte Leadverarbeitung erfolgt separat. Double-Opt-In ist nicht aktiviert.</p>
        `,
      });

  return res.status(200).json({ message: 'Vielen Dank! Ihre Anfrage wurde übermittelt.' });
    } catch (error) {
      console.error('Fehler beim Senden des Whitepapers per E-Mail:', error);
      return res.status(500).json({ error: 'Fehler beim Senden des Whitepapers.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
