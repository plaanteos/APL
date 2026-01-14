import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'admin@apl-dental.com';
    const password = 'AdminAnto17$';
    
    // Verificar si el admin ya existe
    const existingAdmin = await prisma.administrador.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('✅ Usuario administrador ya existe');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Usuario: ${existingAdmin.usuario}`);
      console.log(`   Activo: ${existingAdmin.activo}`);
      
      // Actualizar contraseña para asegurar que es correcta
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.administrador.update({
        where: { email },
        data: { 
          password: hashedPassword,
          activo: true 
        },
      });
      console.log('🔄 Contraseña actualizada exitosamente');
      return;
    }

    // Crear nuevo usuario administrador
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.administrador.create({
      data: {
        email,
        usuario: 'admin',
        password: hashedPassword,
        nombre: 'Administrador Sistema',
        telefono: '1234567890',
        super_usuario: true,
        activo: true,
      },
    });

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Usuario: ${admin.usuario}`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
