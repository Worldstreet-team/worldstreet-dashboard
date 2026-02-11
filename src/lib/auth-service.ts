/**
 * Auth Service Client
 * Communicates with the external auth service at AUTH_SERVICE_URL
 */

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://api.worldstreetgold.com';

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: AuthUser;
    tokens?: AuthTokens;
  };
}

/**
 * Verify a user's identity by their access token.
 * Calls GET /api/auth/verify on the auth service.
 */
export async function verifyToken(accessToken: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Refresh tokens using a refresh token.
 * Calls POST /api/auth/refresh-token on the auth service.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Login a user with email and password.
 * Calls POST /api/auth/login on the auth service.
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Register a new user.
 * Calls POST /api/auth/register on the auth service.
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, firstName, lastName }),
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Logout a user (revoke refresh token).
 * Calls POST /api/auth/logout on the auth service.
 */
export async function logoutUser(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Change user password.
 * Calls POST /api/auth/change-password on the auth service.
 */
export async function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
    cache: 'no-store',
  });

  return res.json();
}

/**
 * Update user profile on the auth service.
 * Calls PATCH /api/auth/profile on the auth service.
 */
export async function updateAuthProfile(
  accessToken: string,
  updates: { firstName?: string; lastName?: string }
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
    cache: 'no-store',
  });

  return res.json();
}
