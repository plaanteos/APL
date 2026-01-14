import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database con modelo oficial...');

  // 1. Crear administrador inicial (solo si no existe)
  const existingAdmin = await prisma.administrador.findUnique({
    where: { email: 'admin@apl-dental.com' }
  });

  let admin;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('AdminAnto17$', 10);
    
    admin = await prisma.administrador.create({
      data: {
        nombre: 'Administrador Principal',
        telefono: '+598 99 123 456',
        email: 'admin@apl-dental.com',
        usuario: 'admin',
        super_usuario: true,
        password: hashedPassword,
        activo: true,
      },
    });
    
    console.log('✅ Administrador creado:', admin.email);
  } else {
    admin = existingAdmin;
    console.log('ℹ️  Administrador ya existe:', admin.email);
  }

  // 2. Crear estados iniciales (catálogo)
  const estados = ['pendiente', 'en_proceso', 'entregado', 'cancelado'];
  
  for (const estado of estados) {
    await prisma.estado.create({
      data: {
        descripcion: estado,
      },
    });
  }
  
  console.log('✅ Estados creados:', estados.join(', '));

  // 3. Crear productos de ejemplo
  const productosTipo = [
    { tipo: 'Corona de porcelana', valor: 150.00 },
    { tipo: 'Puente fijo', valor: 450.00 },
    { tipo: 'Prótesis completa', valor: 800.00 },
    { tipo: 'Prótesis parcial', valor: 500.00 },
    { tipo: 'Carilla dental', valor: 120.00 },
  ];

  for (const prod of productosTipo) {
    await prisma.producto.create({
      data: {
        tipo: prod.tipo,
        valor: prod.valor,
        id_administrador: admin.id,
      },
    });
  }
  
  console.log('✅ Productos creados:', productosTipo.length);

  // 4. Crear cliente de ejemplo
  const cliente = await prisma.cliente.create({
    data: {
      nombre: 'Clínica Dental del Este',
      telefono: '+598 99 234 567',
      email: 'contacto@dentaleste.com',
      id_administrador: admin.id,
    },
  });
  
  console.log('✅ Cliente creado:', cliente.nombre);

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
