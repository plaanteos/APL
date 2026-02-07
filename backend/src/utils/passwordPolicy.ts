import { z } from 'zod';

export type PasswordPolicyOptions = {
  minLength: number;
  disallowNumericOnly: boolean;
};

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
};

export const getPasswordPolicy = (): PasswordPolicyOptions => {
  const minLength = Number(process.env.PASSWORD_MIN_LENGTH ?? 6);
  const disallowNumericOnly = toBool(process.env.PASSWORD_DISALLOW_NUMERIC_ONLY, true);

  return {
    minLength: Number.isFinite(minLength) && minLength > 0 ? minLength : 6,
    disallowNumericOnly,
  };
};

export const passwordSchema = (fieldLabel: string = 'Contraseña') => {
  const policy = getPasswordPolicy();

  let schema = z
    .string()
    .min(policy.minLength, `${fieldLabel} debe tener al menos ${policy.minLength} caracteres`);

  if (policy.disallowNumericOnly) {
    schema = schema.regex(/[^0-9]/, `${fieldLabel} no puede ser solo numérica`);
  }

  return schema;
};
