import { api, APIError, Cookie, Gateway, Header } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import { authHandler } from "encore.dev/auth";

// Secrets for admin credentials
const ADMIN_USER = secret("ADMIN_USER");
const ADMIN_PASSWORD = secret("ADMIN_PASSWORD");
const JWT_SECRET = secret("JWT_SECRET"); // For signing session tokens

// A simple, insecure simulation of JWT. In production, use a library like 'jsonwebtoken'.
const createToken = (payload: object) => Buffer.from(JSON.stringify(payload) + '.' + JWT_SECRET()).toString('base64');
const verifyToken = (token: string) => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [payloadStr, secret] = decoded.split('.');
    if (secret !== JWT_SECRET()) return null;
    return JSON.parse(payloadStr);
  } catch {
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
    log.info("Admin login attempt", { username: params.username });
    if (params.username === ADMIN_USER() && params.password === ADMIN_PASSWORD()) {
      const token = createToken({ user: 'admin', iat: Date.now() });
      return {
        success: true,
        session: {
          value: token,
          expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minute session
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          path: "/",
        },
      };
    }
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

const adminAuth = authHandler<AdminAuthParams, AdminAuthData>(async (params) => {
  const token = params.session?.value;
  if (!token) {
    throw APIError.unauthenticated("Missing session token");
  }
  const payload = verifyToken(token);
  if (!payload || payload.user !== 'admin') {
    throw APIError.unauthenticated("Invalid session token");
  }
  return { userID: 'admin' };
});

// Gateway for the admin service.
export const adminGateway = new Gateway({
  authHandler: adminAuth,
});
