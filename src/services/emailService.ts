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
}

export interface TeamInvitationEmailData {
  invitedBy: string;
  teamName: string;
  teamDescription?: string;
  invitationToken: string;
  invitationUrl: string;
  isNewUser: boolean;
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
        text: options.text || this.htmlToText(options.html)
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
            text: options.text || this.htmlToText(options.html)
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
   * Generiert HTML für Team-Einladungs-E-Mail
   */
  private generateTeamInvitationHTML(data: TeamInvitationEmailData): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
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
                <p>Ihr Account wurde automatisch erstellt. Sie können sich mit dieser E-Mail-Adresse anmelden.</p>
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
