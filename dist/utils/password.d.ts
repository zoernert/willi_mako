export declare class PasswordUtils {
    private static readonly SALT_ROUNDS;
    /**
     * Hash ein Passwort
     */
    static hash(password: string): Promise<string>;
    /**
     * Vergleicht ein Plain-Text Passwort mit einem Hash
     */
    static compare(password: string, hash: string): Promise<boolean>;
    /**
     * Validiert Passwort-Stärke
     */
    static validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=password.d.ts.map