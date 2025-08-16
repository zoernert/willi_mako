import nodemailer from 'nodemailer';
import { getLogger } from '../core/logging/logger';
import { SystemSettingsService, SMTPSettings } from './systemSettingsService';

// Lazy logger initialization to avoid startup issues
let logger: any = null;
const getLoggerSafe = () => {
  if (!logger) {
    try {
      logger = getLogger();
    } catch {
      // Fallback to console if logger not initialized
      logger = console;
    }
  }
  return logger;
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    cid?: string;
  }>;
}

export interface TeamInvitationEmailData {
  invitedBy: string;
  teamName: string;
  teamDescription?: string;
  invitationToken: string;
  invitationUrl: string;
  isNewUser: boolean;
}

export interface ProblemReportEmailData {
  reporterEmail: string;
  reporterName: string;
  problemDescription: string;
  category: string;
  currentPage: string;
  browserInfo: string;
  additionalInfo?: string | null;
  screenshots: Array<{
    filename: string;
    originalName: string;
    path: string;
    size: number;
    mimetype: string;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private lastConfigUpdate = 0;
  private CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize transporter on first use
  }

  /**
   * Get or create SMTP transporter with current settings
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    const now = Date.now();
    
    // Re-create transporter if cache expired or doesn't exist
    if (!this.transporter || now - this.lastConfigUpdate > this.CONFIG_CACHE_TTL) {
      const smtpSettings = await SystemSettingsService.getSMTPSettings();
      
      if (!smtpSettings.enabled) {
        throw new Error('Email notifications are disabled in system settings');
      }

      if (!smtpSettings.host) {
        throw new Error('SMTP host is not configured');
      }

      // Create transport configuration based on port and security settings
      const transportConfig: any = {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        auth: smtpSettings.user && smtpSettings.password ? {
          user: smtpSettings.user,
          pass: smtpSettings.password
        } : undefined,
        // Connection timeouts
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        // Debug options
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      };

      // Configure TLS based on port and security
      if (smtpSettings.port === 465 && smtpSettings.secure) {
        // SSL/TLS for port 465
        transportConfig.tls = {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
          secureProtocol: 'SSLv23_method'
        };
        transportConfig.secure = true;
      } else if (smtpSettings.port === 587) {
        // STARTTLS for port 587
        transportConfig.secure = false;
        transportConfig.requireTLS = true;
        transportConfig.tls = {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
          secureProtocol: 'TLSv1_2_method'
        };
      } else {
        // General TLS configuration
        transportConfig.tls = {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        };
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      this.lastConfigUpdate = now;
      getLoggerSafe().info('SMTP transporter configuration updated');
    }

    return this.transporter!;
  }

  /**
   * Create alternative transporter with different SSL/TLS options for problematic providers
   */
  private async createAlternativeTransporter(smtpSettings: SMTPSettings): Promise<nodemailer.Transporter> {
    const alternativeConfig = {
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: smtpSettings.user && smtpSettings.password ? {
        user: smtpSettings.user,
        pass: smtpSettings.password
      } : undefined,
      // More lenient SSL/TLS options
      tls: {
        rejectUnauthorized: false,
        servername: smtpSettings.host,
        ciphers: 'SSLv3'
      },
      // Longer timeouts for slow servers
      connectionTimeout: 120000,
      greetingTimeout: 60000,
      socketTimeout: 120000,
      // Force legacy SSL for older servers
      secureConnection: smtpSettings.port === 465,
      debug: true,
      logger: true
    };

    return nodemailer.createTransport(alternativeConfig);
  }

  /**
   * Sendet eine E-Mail
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    let lastError: Error | null = null;
    
    try {
      const transporter = await this.getTransporter();
      const smtpSettings = await SystemSettingsService.getSMTPSettings();
      
      const mailOptions = {
        from: `${smtpSettings.fromName} <${smtpSettings.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments || []
      };

      const info = await transporter.sendMail(mailOptions);
      getLoggerSafe().info(`E-Mail erfolgreich gesendet an ${options.to}, MessageID: ${info.messageId}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      getLoggerSafe().warn(`Primäre SMTP-Konfiguration fehlgeschlagen: ${lastError.message}`);
      
      // Versuche alternative Konfiguration bei "Greeting never received" oder ähnlichen Fehlern
      if (lastError.message.includes('Greeting never received') || 
          lastError.message.includes('connection timeout') ||
          lastError.message.includes('ECONNRESET')) {
        
        getLoggerSafe().info('Versuche alternative SMTP-Konfiguration...');
        
        try {
          const smtpSettings = await SystemSettingsService.getSMTPSettings();
          const alternativeTransporter = await this.createAlternativeTransporter(smtpSettings);
          
          const mailOptions = {
            from: `${smtpSettings.fromName} <${smtpSettings.fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || this.htmlToText(options.html),
            attachments: options.attachments || []
          };

          const info = await alternativeTransporter.sendMail(mailOptions);
          getLoggerSafe().info(`E-Mail erfolgreich mit alternativer Konfiguration gesendet an ${options.to}, MessageID: ${info.messageId}`);
          return;
        } catch (alternativeError) {
          getLoggerSafe().error(`Alternative SMTP-Konfiguration ebenfalls fehlgeschlagen: ${alternativeError instanceof Error ? alternativeError.message : String(alternativeError)}`);
        }
      }
    }
    
    getLoggerSafe().error(`Fehler beim Senden der E-Mail: ${lastError?.message || 'Unbekannter Fehler'}`);
    throw new Error('E-Mail konnte nicht gesendet werden');
  }

  /**
   * Sendet eine Team-Einladungs-E-Mail
   */
  async sendTeamInvitation(email: string, data: TeamInvitationEmailData): Promise<void> {
    const subject = `Einladung zum Team "${data.teamName}" bei Willi Mako`;
    
    const html = this.generateTeamInvitationHTML(data);
    
    await this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  /**
   * Sendet eine Passwort-Reset-E-Mail mit Magic Link
   */
  async sendPasswordResetEmail(email: string, userName: string, resetToken: string): Promise<void> {
    const subject = 'Passwort zurücksetzen - Willi Mako';
    
    const html = this.generatePasswordResetHTML(userName, resetToken);
    
    await this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  /**
   * Sendet eine Fehlermeldung zu Marktpartner-Daten
   */
  async sendMarketPartnerErrorReport(
    reporterEmail: string, 
    reporterName: string, 
    marketPartner: any, 
    errorDescription: string
  ): Promise<void> {
    const subject = `Fehlermeldung zu Marktpartner: ${marketPartner.companyName || marketPartner.code || 'Unbekannt'}`;
    
    const html = this.generateErrorReportHTML(reporterEmail, reporterName, marketPartner, errorDescription);
    
    await this.sendEmail({
      to: 'willi@stromhaltig.de',
      subject,
      html
    });
  }

  /**
   * Sendet einen allgemeinen Problembericht mit optionalen Screenshots
   */
  async sendProblemReport(data: ProblemReportEmailData): Promise<void> {
    const subject = `Problembericht: ${data.category} - ${data.problemDescription.substring(0, 50)}...`;
    
    const html = this.generateProblemReportHTML(data);
    
    // Prepare attachments from screenshots
    const attachments = data.screenshots.map(screenshot => ({
      filename: screenshot.originalName,
      path: screenshot.path,
      cid: screenshot.filename // For embedding in email if needed
    }));
    
    await this.sendEmail({
      to: 'willi@stromhaltig.de',
      subject,
      html,
      attachments
    });
  }

  /**
   * Generiert HTML für Team-Einladungs-E-Mail
   */
  private generateTeamInvitationHTML(data: TeamInvitationEmailData): string {
    const baseUrl = 'https://stromhaltig.de';
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team-Einladung</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #147a50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .team-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { 
                display: inline-block; 
                background-color: #147a50; 
                color: white; 
                padding: 12px 25px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 15px 0;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Team-Einladung</h1>
                <p>Sie wurden zu einem Team bei Willi Mako eingeladen!</p>
            </div>
            
            <div class="content">
                ${data.isNewUser ? `
                <p><strong>Willkommen bei Willi Mako!</strong></p>
                <p>Ihr Account wurde automatisch erstellt. Um sich anzumelden:</p>
                <ol>
                    <li>Klicken Sie auf "Einladung annehmen" unten</li>
                    <li>Sie werden automatisch angemeldet</li>
                    <li>Setzen Sie anschließend ein sicheres Passwort in Ihrem Profil</li>
                </ol>
                <p><strong>Wichtig:</strong> Falls Sie sich später manuell anmelden möchten, 
                   verwenden Sie diese E-Mail-Adresse und benutzen Sie die "Passwort vergessen" Funktion 
                   auf der Anmeldeseite, um ein eigenes Passwort zu setzen.</p>
                ` : `
                <p>Hallo!</p>
                `}
                
                <p><strong>${data.invitedBy}</strong> hat Sie eingeladen, dem Team beizutreten:</p>
                
                <div class="team-info">
                    <h2>📋 ${data.teamName}</h2>
                    ${data.teamDescription ? `<p>${data.teamDescription}</p>` : ''}
                </div>
                
                <p><strong>Was ist Willi Mako?</strong></p>
                <p>Willi Mako ist eine intelligente Wissensmanagement-Plattform, die Teams dabei hilft, 
                   Dokumente zu teilen, Wissen zu verwalten und gemeinsam zu lernen.</p>
                
                <p><strong>Als Teammitglied können Sie:</strong></p>
                <ul>
                    <li>📚 Dokumente mit Ihrem Team teilen</li>
                    <li>🔍 In allen Team-Dokumenten suchen</li>
                    <li>🤖 KI-gestützte Antworten auf Ihre Fragen erhalten</li>
                    <li>🏆 Punkte sammeln und in der Team-Bestenliste aufsteigen</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="${data.invitationUrl}" class="button">
                        Einladung annehmen
                    </a>
                </div>
                
                <p><small>Diese Einladung ist 7 Tage gültig. Falls Sie die Einladung nicht annehmen möchten, 
                   können Sie diese E-Mail einfach ignorieren.</small></p>
            </div>
            
            <div class="footer">
                <p>© 2025 Willi Mako - Intelligente Wissensmanagement-Plattform</p>
                <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generiert HTML für Passwort-Reset-E-Mail
   */
  private generatePasswordResetHTML(userName: string, resetToken: string): string {
    const baseUrl = 'https://stromhaltig.de';
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Passwort zurücksetzen</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #147a50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { 
                display: inline-block; 
                background-color: #147a50; 
                color: white; 
                padding: 12px 25px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 15px 0;
                font-weight: bold;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .security-note { background-color: #e8f4f8; border: 1px solid #bee5eb; padding: 15px; margin: 15px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Passwort zurücksetzen</h1>
                <p>Willi Mako - Intelligente Wissensmanagement-Plattform</p>
            </div>
            
            <div class="content">
                <p>Hallo ${userName},</p>
                
                <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts bei Willi Mako gestellt.</p>
                
                <div class="alert-box">
                    <strong>⏰ Wichtiger Hinweis:</strong> Dieser Link ist nur 1 Stunde gültig und kann nur einmal verwendet werden.
                </div>
                
                <p>Klicken Sie auf den folgenden Button, um ein neues Passwort zu setzen:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">
                        Neues Passwort setzen
                    </a>
                </div>
                
                <p><strong>Alternativ können Sie diesen Link in Ihren Browser kopieren:</strong></p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace;">
                    ${resetUrl}
                </p>
                
                <div class="security-note">
                    <h3>🛡️ Sicherheitshinweise:</h3>
                    <ul>
                        <li>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren</li>
                        <li>Ihr aktuelles Passwort bleibt unverändert, bis Sie den Reset-Link verwenden</li>
                        <li>Wir empfehlen ein starkes Passwort mit mindestens 8 Zeichen</li>
                        <li>Teilen Sie diesen Link niemals mit anderen Personen</li>
                    </ul>
                </div>
                
                <p><strong>Probleme beim Zurücksetzen?</strong></p>
                <p>Falls der Link nicht funktioniert, kopieren Sie ihn vollständig in die Adresszeile Ihres Browsers. 
                   Der Link funktioniert nur einmal und läuft nach 1 Stunde ab.</p>
            </div>
            
            <div class="footer">
                <p>© 2025 Willi Mako - Intelligente Wissensmanagement-Plattform</p>
                <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
                <p>Falls Sie Probleme haben, besuchen Sie unsere FAQ-Seite oder kontaktieren Sie den Support.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generiert HTML für Marktpartner-Fehlermeldungs-E-Mail
   */
  private generateErrorReportHTML(
    reporterEmail: string, 
    reporterName: string, 
    marketPartner: any, 
    errorDescription: string
  ): string {
    const currentDate = new Date().toLocaleDateString('de-DE');
    const currentTime = new Date().toLocaleTimeString('de-DE');
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fehlermeldung Marktpartner-Daten</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .error-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
            .market-partner-info { background-color: #e8f4f8; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .reporter-info { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .field { margin-bottom: 10px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 Fehlermeldung Marktpartner-Daten</h1>
                <p>Neue Fehlermeldung von einem Nutzer eingegangen</p>
            </div>
            
            <div class="content">
                <div class="error-info">
                    <h2>📝 Fehlerbeschreibung</h2>
                    <p>${errorDescription}</p>
                </div>
                
                <div class="market-partner-info">
                    <h2>🏢 Betroffener Marktpartner</h2>
                    <div class="field">
                        <span class="field-label">Unternehmensname:</span>
                        <span class="field-value">${marketPartner.companyName || 'Nicht verfügbar'}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Code:</span>
                        <span class="field-value">${marketPartner.code || 'Nicht verfügbar'}</span>
                    </div>
                    ${marketPartner.contacts && marketPartner.contacts[0] && marketPartner.contacts[0].CompanyUID ? `
                    <div class="field">
                        <span class="field-label">Unternehmensnummer:</span>
                        <span class="field-value">${marketPartner.contacts[0].CompanyUID}</span>
                    </div>
                    ` : ''}
                    ${marketPartner.contacts && marketPartner.contacts[0] && marketPartner.contacts[0].BdewCode ? `
                    <div class="field">
                        <span class="field-label">BDEW-Code:</span>
                        <span class="field-value">${marketPartner.contacts[0].BdewCode}</span>
                    </div>
                    ` : ''}
                    ${marketPartner.city || marketPartner.street ? `
                    <div class="field">
                        <span class="field-label">Adresse:</span>
                        <span class="field-value">
                            ${marketPartner.street || ''} 
                            ${marketPartner.postCode || ''} ${marketPartner.city || ''}
                        </span>
                    </div>
                    ` : ''}
                    
                    <h3>📋 Alle verfügbaren Kontakte:</h3>
                    ${marketPartner.contacts && marketPartner.contacts.length > 0 ? 
                        marketPartner.contacts.map((contact: any, index: number) => `
                        <div style="margin-bottom: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 3px;">
                            <strong>Kontakt ${index + 1}:</strong><br/>
                            ${contact.BdewCodeFunction ? `Marktrolle: ${contact.BdewCodeFunction}<br/>` : ''}
                            ${contact.BdewCode ? `BDEW-Code: ${contact.BdewCode}<br/>` : ''}
                            ${contact.CompanyUID ? `Unternehmensnummer: ${contact.CompanyUID}<br/>` : ''}
                            ${contact.CodeContact ? `Ansprechpartner: ${contact.CodeContact}<br/>` : ''}
                            ${contact.CodeContactEmail ? `E-Mail: ${contact.CodeContactEmail}<br/>` : ''}
                            ${contact.CodeContactPhone ? `Telefon: ${contact.CodeContactPhone}<br/>` : ''}
                        </div>
                        `).join('')
                        : '<p>Keine Kontaktdaten verfügbar</p>'
                    }
                </div>
                
                <div class="reporter-info">
                    <h2>👤 Melder</h2>
                    <div class="field">
                        <span class="field-label">Name:</span>
                        <span class="field-value">${reporterName}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">E-Mail:</span>
                        <span class="field-value">${reporterEmail}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Datum:</span>
                        <span class="field-value">${currentDate} um ${currentTime}</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                    <h3>🔧 Nächste Schritte</h3>
                    <ul>
                        <li>Fehlermeldung prüfen und validieren</li>
                        <li>Bei Bedarf Rücksprache mit dem Melder halten</li>
                        <li>Daten in der Datenbank korrigieren</li>
                        <li>Melder über Korrektur informieren</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>© 2025 Willi Mako - Intelligente Wissensmanagement-Plattform</p>
                <p>Diese E-Mail wurde automatisch vom Fehlermeldesystem generiert.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generiert HTML für Problembericht-E-Mail
   */
  private generateProblemReportHTML(data: ProblemReportEmailData): string {
    const currentDate = new Date().toLocaleDateString('de-DE');
    const currentTime = new Date().toLocaleTimeString('de-DE');
    
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Problembericht Willi Mako</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff6b35; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .problem-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ff6b35; }
            .technical-info { background-color: #e8f4f8; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .reporter-info { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .screenshots-info { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .field { margin-bottom: 10px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
            .category-badge { 
                display: inline-block; 
                background-color: #ff6b35; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 12px; 
                font-size: 12px; 
                font-weight: bold; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔧 Problembericht</h1>
                <p>Neuer Problembericht von einem Nutzer</p>
                <span class="category-badge">${data.category}</span>
            </div>
            
            <div class="content">
                <div class="problem-info">
                    <h2>📝 Problembeschreibung</h2>
                    <p>${data.problemDescription}</p>
                    ${data.additionalInfo ? `
                    <h3>ℹ️ Zusätzliche Informationen</h3>
                    <p>${data.additionalInfo}</p>
                    ` : ''}
                </div>
                
                <div class="technical-info">
                    <h2>🔧 Technische Informationen</h2>
                    <div class="field">
                        <span class="field-label">Kategorie:</span>
                        <span class="field-value">${data.category}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Aktuelle Seite:</span>
                        <span class="field-value">${data.currentPage}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Browser-Information:</span>
                        <span class="field-value">${data.browserInfo}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Datum/Zeit:</span>
                        <span class="field-value">${currentDate} um ${currentTime}</span>
                    </div>
                </div>
                
                ${data.screenshots.length > 0 ? `
                <div class="screenshots-info">
                    <h2>📸 Screenshots (${data.screenshots.length})</h2>
                    <p>Die folgenden Screenshots wurden vom Nutzer beigefügt:</p>
                    <ul>
                        ${data.screenshots.map(screenshot => `
                        <li>
                            <strong>${screenshot.originalName}</strong>
                            <br><small>Größe: ${Math.round(screenshot.size / 1024)} KB, Typ: ${screenshot.mimetype}</small>
                        </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="reporter-info">
                    <h2>👤 Nutzer-Informationen</h2>
                    <div class="field">
                        <span class="field-label">Name:</span>
                        <span class="field-value">${data.reporterName}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">E-Mail:</span>
                        <span class="field-value">${data.reporterEmail}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>© 2025 Willi Mako - Automatisch generierter Problembericht</p>
                <p>Diese E-Mail wurde automatisch vom System generiert.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Konvertiert HTML zu einfachem Text (Fallback)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test SMTP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      getLoggerSafe().info('SMTP connection test successful');
      return true;
    } catch (error) {
      getLoggerSafe().error(`SMTP connection test failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Refresh transporter configuration (clears cache)
   */
  refreshConfiguration(): void {
    this.transporter = null;
    this.lastConfigUpdate = 0;
    getLoggerSafe().info('Email service configuration refreshed');
  }

  /**
   * Get current SMTP settings for testing/debugging
   */
  async getCurrentSettings(): Promise<SMTPSettings> {
    return await SystemSettingsService.getSMTPSettings();
  }
}

// Create and export a singleton instance
export const emailService = new EmailService();
