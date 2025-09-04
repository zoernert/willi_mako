import type { NextApiRequest, NextApiResponse } from 'next';

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
      // HIER WÜRDE DIE LOGIK FÜR DEN E-MAIL-VERSAND EINGEFÜGT WERDEN.
      // Dies sollte die gleiche Logik sein, die auch für das "Beratungsformular" verwendet wird.
      // Beispiel (Platzhalter):
      console.log(`Simuliere E-Mail-Versand an ${email} für Whitepaper: ${whitepaperTitle} (${whitepaperPdfUrl})`);
      
      // In einer echten Implementierung würden Sie hier einen E-Mail-Dienst (z.B. Nodemailer, AWS SES) aufrufen.
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   // Konfiguration Ihres SMTP-Servers
      // });
      // await transporter.sendMail({
      //   from: 'noreply@stromhaltig.de',
      //   to: email,
      //   subject: `Ihr angefordertes Whitepaper: ${whitepaperTitle}`,
      //   html: `<p>Sehr geehrte/r Interessent/in,</p>
      //          <p>vielen Dank für Ihr Interesse an unserem Whitepaper "${whitepaperTitle}".</p>
      //          <p>Sie können es hier herunterladen: <a href="${whitepaperPdfUrl}">${whitepaperTitle}</a></p>
      //          <p>Mit freundlichen Grüßen,</p>
      //          <p>Ihr Stromhaltig Team</p>`,
      // });

      return res.status(200).json({ message: 'Whitepaper wurde erfolgreich per E-Mail versendet.' });
    } catch (error) {
      console.error('Fehler beim Senden des Whitepapers per E-Mail:', error);
      return res.status(500).json({ error: 'Fehler beim Senden des Whitepapers.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
