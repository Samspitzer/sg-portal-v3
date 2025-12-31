import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthenticatedRequest, AzureTokenPayload, JWTPayload } from '../types/index.js';
import env from '../config/env.js';
import logger from '../config/logger.js';

// JWKS client for Azure AD public keys
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

// Get signing key from Azure AD
function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        if (signingKey) {
          resolve(signingKey);
        } else {
          reject(new Error('No signing key found'));
        }
      }
    });
  });
}

// Verify Azure AD token
async function verifyAzureToken(token: string): Promise<AzureTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      async (header, callback) => {
        try {
          const key = await getSigningKey(header);
          callback(null, key);
        } catch (err) {
          callback(err as Error);
        }
      },
      {
        audience: env.AZURE_CLIENT_ID,
        issuer: [
          `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/v2.0`,
          `https://sts.windows.net/${env.AZURE_TENANT_ID}/`,
        ],
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as AzureTokenPayload);
        }
      }
    );
  });
}

// Main authentication middleware
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // Try to verify as Azure AD token
    try {
      const azurePayload = await verifyAzureToken(token);
      
      // Convert Azure token to our JWT payload format
      req.user = {
        sub: azurePayload.oid || azurePayload.sub,
        email: azurePayload.preferred_username || azurePayload.email || '',
        name: azurePayload.name,
        roles: azurePayload.roles || ['viewer'],
        permissions: [], // Will be populated from database
        iat: azurePayload.iat,
        exp: azurePayload.exp,
      };
      req.azureToken = token;
      
      logger.debug('Azure token verified', { userId: req.user.sub });
      next();
      return;
    } catch (azureError) {
      logger.debug('Not an Azure token, trying internal JWT');
    }

    // Try as internal JWT (for API keys or internal services)
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      req.user = decoded;
      next();
      return;
    } catch (jwtError) {
      logger.warn('Token verification failed', { error: jwtError });
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

// Permission checking middleware
export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Admins have all permissions
    if (req.user.roles.includes('admin')) {
      next();
      return;
    }

    const hasPermission = permissions.some(
      (perm) =>
        req.user!.permissions.includes(perm) ||
        req.user!.permissions.includes(perm.split(':')[0] + ':*')
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: { required: permissions },
        },
      });
      return;
    }

    next();
  };
}

// Role checking middleware
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role',
          details: { required: roles },
        },
      });
      return;
    }

    next();
  };
}

// Generate internal JWT token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const expiresIn = env.JWT_EXPIRES_IN || '7d';
  // Using explicit options type to avoid type issues with newer jwt versions
  const signOptions = { expiresIn } as jwt.SignOptions;
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

export default authenticate;
