import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';

/**
 * MSAL Configuration for Azure AD Authentication
 * 
 * Client ID and Tenant ID are loaded from environment variables
 * These match the existing V2 Azure AD app registration
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL]', message);
            break;
          case LogLevel.Warning:
            console.warn('[MSAL]', message);
            break;
          case LogLevel.Info:
            if (import.meta.env.DEV) {
              console.info('[MSAL]', message);
            }
            break;
          case LogLevel.Verbose:
            if (import.meta.env.DEV) {
              console.debug('[MSAL]', message);
            }
            break;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Error,
    },
    allowNativeBroker: false,
  },
};

/**
 * Scopes for API access
 */
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

/**
 * Scopes for Microsoft Graph API calls
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphPhotoEndpoint: 'https://graph.microsoft.com/v1.0/me/photo/$value',
};

/**
 * MSAL Instance
 * Single instance shared across the application
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Initialize MSAL
 * Must be called before using MSAL for authentication
 */
export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();
  
  // Handle redirect promise (for redirect login flow)
  const response = await msalInstance.handleRedirectPromise();
  
  if (response) {
    // User has returned from login redirect
    msalInstance.setActiveAccount(response.account);
  } else {
    // Check if there's already an active account
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0] ?? null);
    }
  }
}
