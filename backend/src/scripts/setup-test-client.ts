import { prisma } from '../utils/prisma';

async function setupTestClient() {
  try {
    const admin = await prisma.administrador.findFirst();
    if (!admin) {
      console.error('No se encontró administrador. Ejecuta el seed primero.');
      return;
    }

    const client = await prisma.cliente.upsert({
      where: { email: 'test_jesu@apl.com' },
      update: {
        telefono: '+543408670623',
        id_administrador: admin.id
      },
      create: {
        nombre: 'Jesu Test Client',
        email: 'test_jesu@apl.com',
        telefono: '+543408670623',
        id_administrador: admin.id
      }
    });

    console.log(`✅ Cliente de prueba configurado: ID ${client.id} - ${client.nombre}`);
  } catch (error) {
    console.error('Error configurando cliente:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestClient();
