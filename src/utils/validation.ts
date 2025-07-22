/**
 * Validation Utilities - Einheitliche Validierung
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  
  /**
   * Email-Validierung
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Required Field Validation
   */
  static required(value: any, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (value === null || value === undefined || value === '') {
      errors.push(`${fieldName} is required`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * UUID-Validierung
   */
  static validateUUID(uuid: string): ValidationResult {
    const errors: string[] = [];
    
    if (!uuid) {
      errors.push('UUID is required');
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        errors.push('Invalid UUID format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Kombination mehrerer Validierungen
   */
  static combine(...validations: ValidationResult[]): ValidationResult {
    const allErrors = validations.flatMap(v => v.errors);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  /**
   * Sanitize HTML Input
   */
  static sanitizeHtml(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * String Length Validation
   */
  static validateLength(
    value: string, 
    min: number, 
    max: number, 
    fieldName: string
  ): ValidationResult {
    const errors: string[] = [];
    
    if (!value) {
      errors.push(`${fieldName} is required`);
    } else {
      if (value.length < min) {
        errors.push(`${fieldName} must be at least ${min} characters long`);
      }
      
      if (value.length > max) {
        errors.push(`${fieldName} must be no more than ${max} characters long`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
