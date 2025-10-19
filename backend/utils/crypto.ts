import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_COST_FACTOR = 12;
const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_TOKEN_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  try {
    const hash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
    return hash;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateRandomToken(length: number = DEFAULT_TOKEN_LENGTH): string {
  if (typeof length !== 'number' || length <= 0 || !Number.isInteger(length)) {
    throw new Error('Token length must be a positive integer');
  }

  if (length > 1024) {
    throw new Error('Token length cannot exceed 1024 bytes');
  }

  try {
    const buffer = crypto.randomBytes(length);
    return buffer.toString('hex');
  } catch (error) {
    throw new Error(`Failed to generate random token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
