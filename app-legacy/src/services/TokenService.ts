/**
 * Token Management Service
 * Zentrale Verwaltung für JWT-Tokens mit localStorage-Persistierung
 */

export interface TokenInfo {
  token: string;
  isValid: boolean;
  expiresAt: number;
  timeUntilExpiry: number;
}

export class TokenService {
  private static readonly TOKEN_KEY = 'token';
  private static readonly REFRESH_BUFFER = 5 * 60 * 1000; // 5 Minuten vor Ablauf

  /**
   * Speichert Token im localStorage
   */
  static setToken(token: string): void {
    if (!token) {
      console.warn('Attempted to set empty token');
      return;
    }

    if (this.isTokenExpired(token)) {
      console.warn('Attempted to set expired token');
      return;
    }

    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Lädt Token aus localStorage
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Entfernt Token aus localStorage
   */
  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Prüft ob Token lokal existiert und gültig ist
   */
  static hasValidToken(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Dekodiert JWT Token und extrahiert Payload
   */
  static decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Prüft ob Token abgelaufen ist
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Gibt Token-Ablaufzeit zurück
   */
  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Prüft ob Token bald abläuft (innerhalb des Refresh-Buffers)
   */
  static isTokenExpiringSoon(token: string): boolean {
    const expirationTime = this.getTokenExpiration(token);
    if (!expirationTime) {
      return true;
    }

    const timeUntilExpiry = expirationTime.getTime() - Date.now();
    return timeUntilExpiry <= this.REFRESH_BUFFER;
  }

  /**
   * Gibt vollständige Token-Informationen zurück
   */
  static getTokenInfo(): TokenInfo | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const expirationDate = this.getTokenExpiration(token);
    if (!expirationDate) {
      return null;
    }

    const now = Date.now();
    const expiresAt = expirationDate.getTime();
    const timeUntilExpiry = expiresAt - now;
    const isValid = timeUntilExpiry > 0;

    return {
      token,
      isValid,
      expiresAt,
      timeUntilExpiry
    };
  }

  /**
   * Extrahiert User-Informationen aus Token
   */
  static getUserFromToken(token?: string): any {
    const tokenToUse = token || this.getToken();
    if (!tokenToUse) {
      return null;
    }

    const decoded = this.decodeToken(tokenToUse);
    if (!decoded) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      company: decoded.company
    };
  }

  /**
   * Formatiert Ablaufzeit für Anzeige
   */
  static formatTimeUntilExpiry(token?: string): string {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo || !tokenInfo.isValid) {
      return 'Token ungültig';
    }

    const minutes = Math.floor(tokenInfo.timeUntilExpiry / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} Tag${days !== 1 ? 'e' : ''}`;
    } else if (hours > 0) {
      return `${hours} Stunde${hours !== 1 ? 'n' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
    } else {
      return 'Weniger als 1 Minute';
    }
  }

  /**
   * Bereinigt alle gespeicherten Auth-Daten
   */
  static clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('activeTimelineId');
    localStorage.removeItem('user');
    // Weitere auth-bezogene localStorage Keys hier hinzufügen
  }

  /**
   * Debug-Informationen für Entwicklung
   */
  static getDebugInfo(): any {
    const token = this.getToken();
    if (!token) {
      return { message: 'No token found' };
    }

    const decoded = this.decodeToken(token);
    const tokenInfo = this.getTokenInfo();

    return {
      hasToken: !!token,
      tokenLength: token.length,
      isValid: tokenInfo?.isValid,
      expiresAt: tokenInfo ? new Date(tokenInfo.expiresAt).toISOString() : null,
      timeUntilExpiry: tokenInfo ? this.formatTimeUntilExpiry() : null,
      payload: decoded,
      isExpiringSoon: this.isTokenExpiringSoon(token)
    };
  }
}
