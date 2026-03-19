import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function main() {
  const to = (process.argv[2] || '').trim();
  if (!to) {
    console.error('Uso: npx tsx src/scripts/test-smtp-email.ts <destinatario>');
    process.exit(2);
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;

  const user = process.env.SMTP_USER;
  const passRaw = process.env.SMTP_PASS;
  const pass = (passRaw || '').replace(/\s+/g, '');

  if (!user || !pass) {
    console.error('Falta SMTP_USER/SMTP_PASS en el .env');
    process.exit(2);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  // 1) Validar credenciales/handshake SMTP
  await transporter.verify();
  console.log(`✅ SMTP OK: host=${host} port=${port} secure=${secure}`);

  // 2) Enviar email de prueba
  const from =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `"APL Laboratorio Dental" <${process.env.SMTP_USER}>` : 'APL Laboratorio Dental');

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Test SMTP - APL Backend',
    text: 'Email de prueba enviado desde el backend APL (SMTP).',
    html: '<p>Email de prueba enviado desde el backend APL (SMTP).</p>',
  });

  const accepted = Array.isArray((info as any).accepted) ? (info as any).accepted.join(',') : '';
  const rejected = Array.isArray((info as any).rejected) ? (info as any).rejected.join(',') : '';

  console.log(
    `📧 Envío solicitado: messageId=${(info as any).messageId || 'n/a'} accepted=${accepted || 'n/a'} rejected=${rejected || 'n/a'}`
  );
}

main().catch((err) => {
  const msg = String(err?.message || err);
  console.error('❌ Falló el test SMTP:', msg);
  process.exit(1);
});
