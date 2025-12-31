import { AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance, loginRequest, graphConfig } from './msalConfig';
import type { User } from '@sg-portal/shared';

/**
 * Authentication Service
 * Handles all Azure AD authentication operations
 */
export class AuthService {
  /**
   * Initiate login flow
   * Uses popup by default, falls back to redirect if popup is blocked
   */
  async login(): Promise<AccountInfo | null> {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      msalInstance.setActiveAccount(response.account);
      return response.account;
    } catch (error) {
      // If popup is blocked, try redirect
      if (error instanceof Error && error.message.includes('popup')) {
        await msalInstance.loginRedirect(loginRequest);
        return null;
      }
      throw error;
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const account = msalInstance.getActiveAccount();
    if (account) {
      await msalInstance.logoutPopup({
        account,
        postLogoutRedirectUri: window.location.origin,
      });
    }
  }

  /**
   * Get the current active account
   */
  getActiveAccount(): AccountInfo | null {
    return msalInstance.getActiveAccount();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return msalInstance.getActiveAccount() !== null;
  }

  /**
   * Get access token for Microsoft Graph API calls
   */
  async getAccessToken(): Promise<string | null> {
    const account = msalInstance.getActiveAccount();
    if (!account) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      }
      throw error;
    }
  }

  /**
   * Get ID token for backend API authentication
   */
  async getIdToken(): Promise<string | null> {
    const account = msalInstance.getActiveAccount();
    if (!account) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.idToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await msalInstance.acquireTokenPopup(loginRequest);
        return response.idToken;
      }
      throw error;
    }
  }

  /**
   * Get user profile from Microsoft Graph
   */
  async getUserProfile(): Promise<Partial<User> | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(graphConfig.graphMeEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const profile = await response.json();
      
      return {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        displayName: profile.displayName,
        firstName: profile.givenName,
        lastName: profile.surname,
        department: profile.department,
        jobTitle: profile.jobTitle,
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get user's profile photo from Microsoft Graph
   */
  async getUserPhoto(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(graphConfig.graphPhotoEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
