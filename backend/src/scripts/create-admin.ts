import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required env var: ${name}. ` +
        'Set it before running this script (e.g. APL_ADMIN_EMAIL / APL_ADMIN_PASSWORD).'
    );
  }
  return value.trim();
}

function deriveUsuarioFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'admin';
  const normalized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
  const fallback = 'admin';
  const base = normalized.length > 0 ? normalized : fallback;
  return base.slice(0, 50);
}

async function ensureUniqueUsuario(baseUsuario: string): Promise<string> {
  const base = baseUsuario.slice(0, 50) || 'admin';
  let candidate = base;

  for (let attempt = 0; attempt < 25; attempt++) {
    const exists = await prisma.administrador.findUnique({
      where: { usuario: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;

    const suffix = String(attempt + 1);
    const trimmedBase = base.slice(0, Math.max(1, 50 - suffix.length));
    candidate = `${trimmedBase}${suffix}`;
  }

  throw new Error('Could not find a unique usuario after multiple attempts');
}

async function createOrUpdateAdminUser() {
  try {
    const email = getRequiredEnv('APL_ADMIN_EMAIL');
    const password = getRequiredEnv('APL_ADMIN_PASSWORD');

    const nombre = (process.env.APL_ADMIN_NOMBRE || 'Administrador').trim();
    const telefono = (process.env.APL_ADMIN_TELEFONO || '0000000000').trim();
    const superUsuarioEnv = (process.env.APL_ADMIN_SUPER_USUARIO || 'true').trim().toLowerCase();
    const super_usuario = superUsuarioEnv === 'true' || superUsuarioEnv === '1' || superUsuarioEnv === 'yes';

    const usuarioBase = (process.env.APL_ADMIN_USUARIO || deriveUsuarioFromEmail(email)).trim();

    // Si existe por email, lo actualizamos de manera idempotente.
    const existingByEmail = await prisma.administrador.findUnique({
      where: { email },
      select: { id: true, email: true, usuario: true, activo: true, super_usuario: true },
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingByEmail) {
      const updated = await prisma.administrador.update({
        where: { email },
        data: {
          password: hashedPassword,
          activo: true,
          super_usuario,
          nombre,
          telefono,
        },
        select: { id: true, email: true, usuario: true, activo: true, super_usuario: true },
      });

      console.log('✅ Admin actualizado/asegurado en BD');
      console.log(`   Email: ${updated.email}`);
      console.log(`   Usuario: ${updated.usuario}`);
      console.log(`   Super usuario: ${updated.super_usuario}`);
      console.log(`   Activo: ${updated.activo}`);
      return;
    }

    const usuario = await ensureUniqueUsuario(usuarioBase);

    const created = await prisma.administrador.create({
      data: {
        email,
        usuario,
        password: hashedPassword,
        nombre,
        telefono,
        super_usuario,
        activo: true,
      },
      select: { id: true, email: true, usuario: true, activo: true, super_usuario: true },
    });

    console.log('✅ Admin creado en BD');
    console.log(`   Email: ${created.email}`);
    console.log(`   Usuario: ${created.usuario}`);
    console.log(`   Super usuario: ${created.super_usuario}`);
    console.log(`   Activo: ${created.activo}`);
  } catch (error) {
    console.error('❌ Error creando/actualizando admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createOrUpdateAdminUser();
