/**
 * Validation Utilities - Einheitliche Validierung
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class ValidationUtils {
    /**
     * Email-Validierung
     */
    static validateEmail(email: string): ValidationResult;
    /**
     * Required Field Validation
     */
    static required(value: any, fieldName: string): ValidationResult;
    /**
     * UUID-Validierung
     */
    static validateUUID(uuid: string): ValidationResult;
    /**
     * Kombination mehrerer Validierungen
     */
    static combine(...validations: ValidationResult[]): ValidationResult;
    /**
     * Sanitize HTML Input
     */
    static sanitizeHtml(input: string): string;
    /**
     * String Length Validation
     */
    static validateLength(value: string, min: number, max: number, fieldName: string): ValidationResult;
}
//# sourceMappingURL=validation.d.ts.map