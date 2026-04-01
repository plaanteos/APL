/** Misma regla que el backend: JID argentino correcto con prefijo 549 para móviles. */
export function normalizeWhatsAppDigits(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let s = String(input).trim().replace(/[\s\-()]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) s = s.slice(1);
  let d = s.replace(/\D/g, '');
  if (!d) return '';

  if (d.startsWith('54') && !d.startsWith('549')) {
    d = '549' + d.slice(2);
  }

  return d;
}

/** Para UI: + + dígitos normalizados (validación E.164 mínima). */
export function toInternationalPlus(input: string): string {
  const d = normalizeWhatsAppDigits(input);
  if (!d) return '';
  return `+${d}`;
}

/**
 * Formatea el número mientras se escribe para que se lea como internacional.
 * Caso optimizado para móviles de Argentina: +54 9 11 3756 75
 */
export function formatPhoneInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  const digits = String(input).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('54')) {
    const rest = digits.slice(2);
    const parts: string[] = ['+54'];

    if (rest.length >= 1) parts.push(rest.slice(0, 1));
    if (rest.length >= 2) parts.push(rest.slice(1, 3));
    if (rest.length >= 4) parts.push(rest.slice(3, 7));
    if (rest.length >= 8) parts.push(rest.slice(7, 11));

    return parts.join(' ').trim();
  }

  const chunks = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9), digits.slice(9, 13)]
    .filter(Boolean);

  return `+${chunks.join(' ')}`.trim();
}
