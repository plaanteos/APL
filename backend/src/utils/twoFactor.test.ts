import { describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { consumeBackupCode, generateBackupCodes, hashBackupCodes, verifyTotp } from './twoFactor';

describe('twoFactor', () => {
  it('genera backup codes con formato XXXXX-XXXXX', () => {
    const codes = generateBackupCodes(5);
    expect(codes).toHaveLength(5);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    }
  });

  it('consume un backup code y lo elimina del set', async () => {
    const codes = generateBackupCodes(3);
    const hashed = await hashBackupCodes(codes);

    const toConsume = codes[1];
    const result = await consumeBackupCode(toConsume, hashed);
    expect(result.ok).toBe(true);
    expect(result.remaining).toHaveLength(2);

    const secondTry = await consumeBackupCode(toConsume, result.remaining);
    expect(secondTry.ok).toBe(false);
  });

  it('verifica TOTP válido con secret conocido', () => {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    expect(verifyTotp(secret, token)).toBe(true);
  });
});
