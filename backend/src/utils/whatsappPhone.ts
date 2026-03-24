/**
 * Dígitos E.164 sin "+" para construir JID: {digits}@s.whatsapp.net
 *
 * Argentina: muchos contactos se guardan como +54 11 … sin el 9 móvil.
 * WhatsApp usa +54 9 área número → en dígitos debe ser 549… no 5411…
 * Si se envía 5411…, abre otro chat / estado "esperando mensaje" y no entrega bien.
 */
export function normalizeWhatsAppDigits(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let s = input.trim().replace(/[\s\-()]/g, '');
  if (s.startsWith('00')) s = s.slice(2);
  let d = s.replace(/\D/g, '');
  if (!d) return '';

  if (d.startsWith('54') && !d.startsWith('549')) {
    d = '549' + d.slice(2);
  }

  return d;
}
