import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'admin@apl-dental.com';
    const password = 'AdminAnto17$';
    
    // Check if admin already exists
    const existingAdmin = await prisma.administrador.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Activo: ${existingAdmin.activo}`);
      
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.administrador.update({
        where: { email },
        data: { 
          password: hashedPassword,
          activo: true 
        },
      });
      console.log('🔄 Password updated successfully');
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.administrador.create({
      data: {
        email,
        username: 'admin',
        password: hashedPassword,
        nombres: 'Administrador',
        apellidos: 'Sistema',
        telefono: '1234567890',
        rol: 'ADMIN',
        activo: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
