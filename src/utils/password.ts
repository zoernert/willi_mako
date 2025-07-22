/**
 * Password-Hashing Utilities - Standardisiert bcryptjs Verwendung
 */
import bcryptjs from 'bcryptjs';

export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash ein Passwort
   */
  static async hash(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required');
    }
    
    return await bcryptjs.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Vergleicht ein Plain-Text Passwort mit einem Hash
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    
    return await bcryptjs.compare(password, hash);
  }

  /**
   * Validiert Passwort-Stärke
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
