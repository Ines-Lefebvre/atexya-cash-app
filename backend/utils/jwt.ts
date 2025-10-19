import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface AccessTokenPayload {
  userId: string;
  role: string;
  type: 'access';
}

interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

interface DecodedToken {
  userId: string;
  role?: string;
  type: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return secret;
}

export function generateAccessToken(userId: string, role: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }

  if (!role || typeof role !== 'string') {
    throw new Error('role must be a non-empty string');
  }

  const secret = getJwtSecret();

  const payload: AccessTokenPayload = {
    userId,
    role,
    type: 'access',
  };

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'atexya-cash-app',
      audience: 'atexya-users',
    });

    return token;
  } catch (error) {
    throw new Error(`Failed to generate access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateRefreshToken(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }

  const secret = getJwtSecret();

  const payload: RefreshTokenPayload = {
    userId,
    type: 'refresh',
  };

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'atexya-cash-app',
      audience: 'atexya-users',
    });

    return token;
  } catch (error) {
    throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function verifyToken(token: string): DecodedToken {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'atexya-cash-app',
      audience: 'atexya-users',
    }) as DecodedToken;

    if (!decoded.userId || !decoded.type) {
      throw new Error('Invalid token payload: missing required fields');
    }

    if (decoded.type !== 'access' && decoded.type !== 'refresh') {
      throw new Error(`Invalid token type: ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${error.message}`);
    }

    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token is not yet valid');
    }

    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function decodeTokenWithoutVerify(token: string): any {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }

  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error('Failed to decode token');
    }

    return decoded.payload;
  } catch (error) {
    throw new Error(`Token decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = decodeTokenWithoutVerify(token);
    
    if (decoded.exp && typeof decoded.exp === 'number') {
      return new Date(decoded.exp * 1000);
    }

    return null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  
  if (!expiry) {
    return true;
  }

  return expiry.getTime() <= Date.now();
}
