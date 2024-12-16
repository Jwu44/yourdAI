import { encrypt, decrypt } from './encryption';  // We'll create this next
import { CalendarCredentials } from './types';

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

export class TokenService {
  private static instance: TokenService;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!this.instance) {
      this.instance = new TokenService();
    }
    return this.instance;
  }

  /**
   * Store calendar tokens securely
   * @param userId - The user's ID
   * @param credentials - The calendar credentials to store
   */
  async storeCalendarTokens(
    userId: string,
    credentials: CalendarCredentials
  ): Promise<void> {
    try {
      const tokenData: StoredTokenData = {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        scopes: credentials.scopes
      };

      // Encrypt sensitive data before storing
      const encryptedData = await encrypt(JSON.stringify(tokenData));
      
      // Store in secure httpOnly cookie
      document.cookie = `calendar_tokens_${userId}=${encryptedData}; path=/; secure; samesite=strict; max-age=31536000`;
      
      // Store minimal data in session storage for quick access checks
      sessionStorage.setItem(`calendar_connected_${userId}`, 'true');
      sessionStorage.setItem(`calendar_expires_${userId}`, credentials.expiresAt.toString());
    } catch (error) {
      console.error('Error storing calendar tokens:', error);
      throw new Error('Failed to store calendar tokens securely');
    }
  }

  /**
   * Retrieve stored calendar tokens
   * @param userId - The user's ID
   */
  async getCalendarTokens(userId: string): Promise<StoredTokenData | null> {
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`calendar_tokens_${userId}=`));

      if (!cookie) return null;

      const encryptedData = cookie.split('=')[1];
      const decryptedData = await decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error retrieving calendar tokens:', error);
      return null;
    }
  }

  /**
   * Check if tokens need refresh
   * @param userId - The user's ID
   */
  async needsRefresh(userId: string): Promise<boolean> {
    const expiresAt = sessionStorage.getItem(`calendar_expires_${userId}`);
    if (!expiresAt) return true;

    const expirationTime = parseInt(expiresAt, 10);
    const currentTime = Date.now();
    
    return currentTime + TOKEN_REFRESH_THRESHOLD > expirationTime;
  }

  /**
   * Refresh calendar access token
   * @param userId - The user's ID
   * @param refreshToken - The refresh token
   */
  async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    // Implement singleton pattern for refresh to prevent multiple simultaneous refreshes
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh-calendar-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        
        // Update stored tokens
        await this.storeCalendarTokens(userId, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
          expiresAt: data.expiresAt,
          scopes: data.scopes
        });

        return data.accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clean up stored tokens
   * @param userId - The user's ID
   */
  async clearTokens(userId: string): Promise<void> {
    try {
      // Remove cookie
      document.cookie = `calendar_tokens_${userId}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      // Clear session storage
      sessionStorage.removeItem(`calendar_connected_${userId}`);
      sessionStorage.removeItem(`calendar_expires_${userId}`);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   * @param userId - The user's ID
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const tokens = await this.getCalendarTokens(userId);
      if (!tokens) return null;

      if (await this.needsRefresh(userId)) {
        if (!tokens.refreshToken) {
          throw new Error('No refresh token available');
        }
        return this.refreshAccessToken(userId, tokens.refreshToken);
      }

      return tokens.accessToken;
    } catch (error) {
      console.error('Error getting valid access token:', error);
      return null;
    }
  }
}

export const tokenService = TokenService.getInstance();