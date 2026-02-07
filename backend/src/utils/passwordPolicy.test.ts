import { describe, expect, it, vi, afterEach } from 'vitest';
import { getPasswordPolicy, passwordSchema } from './passwordPolicy';

const setEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

describe('passwordPolicy', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('usa defaults: minLength=6 y disallowNumericOnly=true', () => {
    setEnv('PASSWORD_MIN_LENGTH', undefined);
    setEnv('PASSWORD_DISALLOW_NUMERIC_ONLY', undefined);

    const policy = getPasswordPolicy();
    expect(policy.minLength).toBe(6);
    expect(policy.disallowNumericOnly).toBe(true);
  });

  it('rechaza contraseña solo numérica cuando disallowNumericOnly=true', () => {
    process.env.PASSWORD_MIN_LENGTH = '6';
    process.env.PASSWORD_DISALLOW_NUMERIC_ONLY = 'true';

    const schema = passwordSchema('Contraseña');
    const result = schema.safeParse('123456');
    expect(result.success).toBe(false);
  });

  it('acepta contraseña alfanumérica con longitud mínima', () => {
    process.env.PASSWORD_MIN_LENGTH = '6';
    process.env.PASSWORD_DISALLOW_NUMERIC_ONLY = 'true';

    const schema = passwordSchema('Contraseña');
    const result = schema.safeParse('abc123');
    expect(result.success).toBe(true);
  });

  it('permite contraseña numérica si disallowNumericOnly=false', () => {
    process.env.PASSWORD_MIN_LENGTH = '6';
    process.env.PASSWORD_DISALLOW_NUMERIC_ONLY = 'false';

    const schema = passwordSchema('Contraseña');
    const result = schema.safeParse('123456');
    expect(result.success).toBe(true);
  });
});
