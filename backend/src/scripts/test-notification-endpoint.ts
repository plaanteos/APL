import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

async function main() {
  const baseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET no está configurado');
  }

  // Token de prueba: el middleware solo verifica firma y exp.
  const token = jwt.sign(
    { id: 1, email: 'test@local', super_usuario: true },
    jwtSecret,
    { expiresIn: '5m' }
  );

  const to = process.argv[2] || 'jesusjcopes@gmail.com';
  const subject = 'Prueba endpoint /api/notifications/send';
  const message = `Mensaje de prueba desde backend (endpoint /api/notifications/send) - ${new Date().toISOString()}`;

  const res = await fetch(`${baseUrl}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: 'email',
      to,
      subject,
      message,
    }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${json ? JSON.stringify(json) : text}`);
  }

  console.log('✅ Respuesta API:', json || text);
  console.log(`📧 Si SMTP está OK, debería llegar a: ${to}`);
}

main().catch((err) => {
  console.error('❌ Falló prueba de endpoint:', err?.message || err);
  process.exit(1);
});
