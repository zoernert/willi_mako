import { SMTPSettings } from './systemSettingsService';
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
export declare class EmailService {
    private transporter;
    private lastConfigUpdate;
    private CONFIG_CACHE_TTL;
    constructor();
    private getTransporter;
    private createAlternativeTransporter;
    sendEmail(options: EmailOptions): Promise<void>;
    sendTeamInvitation(email: string, data: TeamInvitationEmailData): Promise<void>;
    sendPasswordResetEmail(email: string, userName: string, resetToken: string): Promise<void>;
    private generateTeamInvitationHTML;
    private generatePasswordResetHTML;
    private htmlToText;
    testConnection(): Promise<boolean>;
    refreshConfiguration(): void;
    getCurrentSettings(): Promise<SMTPSettings>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=emailService.d.ts.map