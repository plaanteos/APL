import { prisma } from '../utils/prisma';

async function setupTestClient() {
  try {
    const admin = await prisma.administrador.findFirst();
    if (!admin) {
      console.error('No se encontró administrador. Ejecuta el seed primero.');
      return;
    }

    const existingClient = await prisma.cliente.findFirst({
      where: {
        id_administrador: admin.id,
        email: 'test_jesu@apl.com',
      },
      select: { id: true },
    });

    const client = existingClient
      ? await prisma.cliente.update({
          where: { id: existingClient.id },
          data: {
            telefono: '+543408670623',
            id_administrador: admin.id,
          },
        })
      : await prisma.cliente.create({
          data: {
            nombre: 'Jesu Test Client',
            email: 'test_jesu@apl.com',
            telefono: '+543408670623',
            id_administrador: admin.id,
          },
        });

    console.log(`✅ Cliente de prueba configurado: ID ${client.id} - ${client.nombre}`);
  } catch (error) {
    console.error('Error configurando cliente:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestClient();
