export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class ValidationUtils {
    static validateEmail(email: string): ValidationResult;
    static required(value: any, fieldName: string): ValidationResult;
    static validateUUID(uuid: string): ValidationResult;
    static combine(...validations: ValidationResult[]): ValidationResult;
    static sanitizeHtml(input: string): string;
    static validateLength(value: string, min: number, max: number, fieldName: string): ValidationResult;
}
//# sourceMappingURL=validation.d.ts.map