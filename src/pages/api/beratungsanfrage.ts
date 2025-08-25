import { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../services/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const {
      companyName,
      firstName,
      lastName,
      email,
      phone,
      billingAddress,
      billingZip,
      billingCity,
      message,
    } = req.body;

    // Validate required fields
    if (!companyName || !firstName || !lastName || !email || !billingAddress || !billingZip || !billingCity) {
      return res.status(400).json({ message: 'Bitte füllen Sie alle erforderlichen Felder aus.' });
    }

    // Create email content
    const htmlContent = `
      <h1>Neue Beratungsanfrage für Willi-Mako</h1>
      <h2>Unternehmensdaten:</h2>
      <p><strong>Firma:</strong> ${companyName}</p>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>E-Mail:</strong> ${email}</p>
      <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
      
      <h2>Rechnungsadresse:</h2>
      <p>${billingAddress}</p>
      <p>${billingZip} ${billingCity}</p>
      
      <h2>Nachricht:</h2>
      <p>${message || 'Keine Nachricht hinterlassen'}</p>
      
      <p>Der Interessent wurde darauf hingewiesen, dass die Beratung kostenpflichtig sein kann und hat dies bestätigt.</p>
    `;

    // Use the existing EmailService to send the email
    const emailService = new EmailService();
    await emailService.sendEmail({
      to: 'thorsten.zoerner@stromdao.com',
      subject: `Neue Beratungsanfrage von ${companyName}`,
      html: htmlContent
    });

    return res.status(200).json({ success: true, message: 'Beratungsanfrage erfolgreich gesendet' });
  } catch (error) {
    console.error('Error sending consultation request:', error);
    
    // Handle different error types with appropriate messages
    let errorMessage = 'Beim Senden der Anfrage ist ein Fehler aufgetreten.';
    
    // Check for authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Authentication') || 
          error.message.includes('auth') || 
          error.message.includes('credentials') ||
          error.message.includes('5.7.0')) {
        errorMessage = 'Fehler bei der Email-Authentifizierung. Bitte kontaktieren Sie den Administrator.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        errorMessage = 'Verbindung zum Email-Server fehlgeschlagen. Bitte versuchen Sie es später erneut.';
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
}
