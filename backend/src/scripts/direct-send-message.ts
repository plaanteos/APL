import { whatsappSessionManager } from '../services/whatsapp-session-manager.service';
import { prisma } from '../utils/prisma';

async function sendSpecificMessage() {
  const userId = 1; // ID del administrador (ajustar según DB)
  const recipient = '+543408670623';
  const text = 'hola jesu';

  console.log(`📤 Intentando enviar mensaje: "${text}" a ${recipient}`);

  try {
    const admin = await prisma.administrador.findFirst({
        where: { id: userId }
    });
    
    if (!admin) {
        console.error('❌ Error: Usuario administrador no encontrado.');
        return;
    }

    if (!whatsappSessionManager.isConnected(userId, userId)) {
        console.warn('⚠️  WhatsApp no está conectado para este usuario. Debes escanear el QR en la app primero.');
        return;
    }

    await whatsappSessionManager.sendMessage(userId, userId, recipient, text);
    console.log('✅ ¡Mensaje enviado con éxito!');
  } catch (err: any) {
    console.error('❌ Falló el envío:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

sendSpecificMessage();
