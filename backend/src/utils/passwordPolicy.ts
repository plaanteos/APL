import { z } from 'zod';

export type PasswordPolicyOptions = {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
};

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
};

export const getPasswordPolicy = (): PasswordPolicyOptions => {
  const minLength = Number(process.env.PASSWORD_MIN_LENGTH ?? 8);
  const requireComplexity = toBool(process.env.PASSWORD_REQUIRE_COMPLEXITY, true);

  return {
    minLength: Number.isFinite(minLength) && minLength > 0 ? minLength : 8,
    requireUpper: requireComplexity,
    requireLower: requireComplexity,
    requireNumber: requireComplexity,
    requireSymbol: requireComplexity,
  };
};

export const passwordSchema = (fieldLabel: string = 'Contraseña') => {
  const policy = getPasswordPolicy();

  let schema = z
    .string()
    .min(policy.minLength, `${fieldLabel} debe tener al menos ${policy.minLength} caracteres`);

  if (policy.requireUpper) {
    schema = schema.regex(/[A-Z]/, `${fieldLabel} debe incluir al menos una letra mayúscula`);
  }
  if (policy.requireLower) {
    schema = schema.regex(/[a-z]/, `${fieldLabel} debe incluir al menos una letra minúscula`);
  }
  if (policy.requireNumber) {
    schema = schema.regex(/[0-9]/, `${fieldLabel} debe incluir al menos un número`);
  }
  if (policy.requireSymbol) {
    schema = schema.regex(/[^A-Za-z0-9]/, `${fieldLabel} debe incluir al menos un símbolo`);
  }

  return schema;
};
