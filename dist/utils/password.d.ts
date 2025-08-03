export declare class PasswordUtils {
    private static readonly SALT_ROUNDS;
    static hash(password: string): Promise<string>;
    static compare(password: string, hash: string): Promise<boolean>;
    static validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=password.d.ts.map