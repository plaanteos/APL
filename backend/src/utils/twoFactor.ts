import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';

export const getTwoFactorIssuer = () => process.env.TWOFA_ISSUER || 'APL Laboratorio Dental';

export const normalizeOtp = (value: string) => value.replace(/\s+/g, '').trim();

export const verifyTotp = (secret: string, token: string) => {
  const normalized = normalizeOtp(token);
  authenticator.options = { window: 1 };
  return authenticator.verify({ token: normalized, secret });
};

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (length: number) => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
};

export const generateBackupCodes = (count: number = 10) => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomCode(10);
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
};

export const hashBackupCodes = async (codes: string[]) => {
  const hashed: string[] = [];
  for (const code of codes) {
    hashed.push(await bcrypt.hash(code, 12));
  }
  return hashed;
};

export const consumeBackupCode = async (
  backupCode: string,
  hashedCodes: string[]
): Promise<{ ok: boolean; remaining: string[] }> => {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(backupCode, hashedCodes[i]);
    if (isMatch) {
      const remaining = [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)];
      return { ok: true, remaining };
    }
  }
  return { ok: false, remaining: hashedCodes };
};
