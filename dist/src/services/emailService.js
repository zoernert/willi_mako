"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../core/logging/logger");
const systemSettingsService_1 = require("./systemSettingsService");
// Lazy logger initialization to avoid startup issues
let logger = null;
const getLoggerSafe = () => {
    if (!logger) {
        try {
            logger = (0, logger_1.getLogger)();
        }
        catch (_a) {
            // Fallback to console if logger not initialized
            logger = console;
        }
    }
    return logger;
};
class EmailService {
    constructor() {
        this.transporter = null;
        this.lastConfigUpdate = 0;
        this.CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        // Initialize transporter on first use
    }
    /**
     * Get or create SMTP transporter with current settings
     */
    async getTransporter() {
        const now = Date.now();
        // Re-create transporter if cache expired or doesn't exist
        if (!this.transporter || now - this.lastConfigUpdate > this.CONFIG_CACHE_TTL) {
            const smtpSettings = await systemSettingsService_1.SystemSettingsService.getSMTPSettings();
            if (!smtpSettings.enabled) {
                throw new Error('Email notifications are disabled in system settings');
            }
            if (!smtpSettings.host) {
                throw new Error('SMTP host is not configured');
            }
            // Create transport configuration based on port and security settings
            const transportConfig = {
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
            }
            else if (smtpSettings.port === 587) {
                // STARTTLS for port 587
                transportConfig.secure = false;
                transportConfig.requireTLS = true;
                transportConfig.tls = {
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                    secureProtocol: 'TLSv1_2_method'
                };
            }
            else {
                // General TLS configuration
                transportConfig.tls = {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                };
            }
            this.transporter = nodemailer_1.default.createTransport(transportConfig);
            this.lastConfigUpdate = now;
            getLoggerSafe().info('SMTP transporter configuration updated');
        }
        return this.transporter;
    }
    /**
     * Create alternative transporter with different SSL/TLS options for problematic providers
     */
    async createAlternativeTransporter(smtpSettings) {
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
        return nodemailer_1.default.createTransport(alternativeConfig);
    }
    /**
     * Sendet eine E-Mail
     */
    async sendEmail(options) {
        let lastError = null;
        try {
            const transporter = await this.getTransporter();
            const smtpSettings = await systemSettingsService_1.SystemSettingsService.getSMTPSettings();
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
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            getLoggerSafe().warn(`Primäre SMTP-Konfiguration fehlgeschlagen: ${lastError.message}`);
            // Versuche alternative Konfiguration bei "Greeting never received" oder ähnlichen Fehlern
            if (lastError.message.includes('Greeting never received') ||
                lastError.message.includes('connection timeout') ||
                lastError.message.includes('ECONNRESET')) {
                getLoggerSafe().info('Versuche alternative SMTP-Konfiguration...');
                try {
                    const smtpSettings = await systemSettingsService_1.SystemSettingsService.getSMTPSettings();
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
                }
                catch (alternativeError) {
                    getLoggerSafe().error(`Alternative SMTP-Konfiguration ebenfalls fehlgeschlagen: ${alternativeError instanceof Error ? alternativeError.message : String(alternativeError)}`);
                }
            }
        }
        getLoggerSafe().error(`Fehler beim Senden der E-Mail: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unbekannter Fehler'}`);
        throw new Error('E-Mail konnte nicht gesendet werden');
    }
    /**
     * Sendet eine Team-Einladungs-E-Mail
     */
    async sendTeamInvitation(email, data) {
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
    async sendPasswordResetEmail(email, userName, resetToken) {
        const subject = 'Passwort zurücksetzen - Willi Mako';
        const html = this.generatePasswordResetHTML(userName, resetToken);
        await this.sendEmail({
            to: email,
            subject,
            html
        });
    }
    /**
     * Generiert HTML für Team-Einladungs-E-Mail
     */
    generateTeamInvitationHTML(data) {
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
    generatePasswordResetHTML(userName, resetToken) {
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
     * Konvertiert HTML zu einfachem Text (Fallback)
     */
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Test SMTP connection
     */
    async testConnection() {
        try {
            const transporter = await this.getTransporter();
            await transporter.verify();
            getLoggerSafe().info('SMTP connection test successful');
            return true;
        }
        catch (error) {
            getLoggerSafe().error(`SMTP connection test failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * Refresh transporter configuration (clears cache)
     */
    refreshConfiguration() {
        this.transporter = null;
        this.lastConfigUpdate = 0;
        getLoggerSafe().info('Email service configuration refreshed');
    }
    /**
     * Get current SMTP settings for testing/debugging
     */
    async getCurrentSettings() {
        return await systemSettingsService_1.SystemSettingsService.getSMTPSettings();
    }
}
exports.EmailService = EmailService;
// Create and export a singleton instance
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map