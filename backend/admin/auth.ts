import { api, APIError, Cookie, Gateway, Header } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { authHandler } from "encore.dev/auth";
import jwt from "jsonwebtoken";
import { safeLog } from "../utils/safeLog";

// Secrets for admin credentials
const ADMIN_USER = secret("ADMIN_USER");
const ADMIN_PASSWORD = secret("ADMIN_PASSWORD");
const JWT_SECRET = secret("JWT_SECRET");

interface JWTPayload {
  user: string;
  iat: number;
  exp: number;
}

const createToken = (payload: { user: string }): string => {
  const jwtSecret = JWT_SECRET();
  if (!jwtSecret || jwtSecret.trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }
  
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours
    },
    jwtSecret,
    { algorithm: 'HS256' }
  );
};

const verifyToken = (token: string): JWTPayload | null => {
  try {
    const jwtSecret = JWT_SECRET();
    if (!jwtSecret || jwtSecret.trim() === "") {
      safeLog.error("JWT_SECRET is not configured");
      return null;
    }
    
    const payload = jwt.verify(token, jwtSecret, { 
      algorithms: ['HS256']
    }) as JWTPayload;
    
    // Vérification additionnelle de l'expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      safeLog.warn("Token expired", { exp: payload.exp, now: Math.floor(Date.now() / 1000) });
      return null;
    }
    
    return payload;
  } catch (error: any) {
    safeLog.warn("JWT verification failed", { error: error.message });
    return null;
  }
};

interface LoginRequest {
  username?: string;
  password?: string;
}

interface LoginResponse {
  success: boolean;
  session?: Cookie<"atexya_admin_session">;
}

// Logs in an admin user.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/admin/login" },
  async (params) => {
    safeLog.info("Admin login attempt", { username: params.username });
    
    if (params.username === ADMIN_USER() && params.password === ADMIN_PASSWORD()) {
      const token = createToken({ user: 'admin' });
      
      safeLog.info("Admin login successful", { username: params.username });
      
      return {
        success: true,
        session: {
          value: token,
          expires: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          path: "/",
        },
      };
    }
    
    safeLog.warn("Admin login failed", { username: params.username });
    throw APIError.unauthenticated("Invalid credentials");
  }
);

interface LogoutResponse {
  success: boolean;
  session?: Cookie<"atexya_admin_session">;
}

// Logs out an admin user.
export const logout = api<void, LogoutResponse>(
  { expose: true, method: "POST", path: "/admin/logout" },
  async () => {
    return {
      success: true,
      session: {
        value: "",
        expires: new Date(0), // Expire immediately
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        path: "/",
      },
    };
  }
);

// Auth handler for admin routes
interface AdminAuthParams {
  session?: Cookie<"atexya_admin_session">;
}

export interface AdminAuthData {
  userID: string;
}

export const adminAuth = authHandler<AdminAuthParams, AdminAuthData>(async (params) => {
  const token = params.session?.value;
  
  if (!token) {
    safeLog.warn("Admin auth failed: missing token");
    throw APIError.unauthenticated("Session expirée ou manquante");
  }
  
  const payload = verifyToken(token);
  
  if (!payload || payload.user !== 'admin') {
    safeLog.warn("Admin auth failed: invalid token or user", { 
      hasPayload: !!payload,
      user: payload?.user 
    });
    throw APIError.unauthenticated("Session invalide ou expirée");
  }
  
  return { userID: 'admin' };
});

// Gateway for the admin service.
export const adminGateway = new Gateway({
  authHandler: adminAuth,
});
