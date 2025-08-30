import { SMTPSettings } from './systemSettingsService';
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
export declare class EmailService {
    private transporter;
    private lastConfigUpdate;
    private CONFIG_CACHE_TTL;
    constructor();
    /**
     * Get or create SMTP transporter with current settings
     */
    private getTransporter;
    /**
     * Create alternative transporter with different SSL/TLS options for problematic providers
     */
    private createAlternativeTransporter;
    /**
     * Send an email and return the messageId (if available)
     */
    sendEmailWithInfo(options: EmailOptions): Promise<{
        messageId?: string;
    }>;
    /**
     * Sendet eine E-Mail (kompatible API)
     */
    sendEmail(options: EmailOptions): Promise<void>;
    /**
     * Sendet eine Team-Einladungs-E-Mail
     */
    sendTeamInvitation(email: string, data: TeamInvitationEmailData): Promise<void>;
    /**
     * Sendet eine Passwort-Reset-E-Mail mit Magic Link
     */
    sendPasswordResetEmail(email: string, userName: string, resetToken: string): Promise<void>;
    /**
     * Sendet eine Fehlermeldung zu Marktpartner-Daten
     */
    sendMarketPartnerErrorReport(reporterEmail: string, reporterName: string, marketPartner: any, errorDescription: string): Promise<void>;
    /**
     * Sendet einen allgemeinen Problembericht mit optionalen Screenshots
     */
    sendProblemReport(data: ProblemReportEmailData): Promise<void>;
    /**
     * Generiert HTML für Team-Einladungs-E-Mail
     */
    private generateTeamInvitationHTML;
    /**
     * Generiert HTML für Passwort-Reset-E-Mail
     */
    private generatePasswordResetHTML;
    /**
     * Generiert HTML für Marktpartner-Fehlermeldungs-E-Mail
     */
    private generateErrorReportHTML;
    /**
     * Generiert HTML für Problembericht-E-Mail
     */
    private generateProblemReportHTML;
    /**
     * Konvertiert HTML zu einfachem Text (Fallback)
     */
    private htmlToText;
    /**
     * Test SMTP connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Refresh transporter configuration (clears cache)
     */
    refreshConfiguration(): void;
    /**
     * Get current SMTP settings for testing/debugging
     */
    getCurrentSettings(): Promise<SMTPSettings>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=emailService.d.ts.map