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
