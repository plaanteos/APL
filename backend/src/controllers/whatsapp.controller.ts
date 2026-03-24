import { Response } from 'express';
import { whatsappSessionManager } from '../services/whatsapp-session-manager.service';
import logger from '../utils/logger';
import QRCode from 'qrcode';
import { prisma } from '../utils/prisma';

/**
 * WhatsAppController - Versión con Aislamiento Estricto y Auditoría
 */
export class WhatsAppController {
    
    /**
     * POST /api/whatsapp/connect
     */
    static async connect(req: any, res: Response) {
        const userId = Number(req.query.userId || req.body.userId || req.user?.id);
        const requesterId = Number(req.user?.id);

        if (whatsappSessionManager.isConnected(userId, requesterId)) {
            return res.status(200).json({ status: "already_connected" });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        // Latido para evitar timeouts de Render (cada 15s)
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 15000);

        try {
            // Enviar ping inicial para confirmar conexión abierta
            sendEvent({ status: "initializing" });

            await whatsappSessionManager.connectWhatsApp(
                userId,
                requesterId,
                async (qr) => {
                    const qrBase64 = await QRCode.toDataURL(qr);
                    sendEvent({ status: "qr", qr: qrBase64 });
                },
                () => {
                    clearInterval(heartbeat);
                    sendEvent({ status: "connected" });
                    setTimeout(() => res.end(), 1000);
                },
                (reason) => {
                    clearInterval(heartbeat);
                    sendEvent({ status: "disconnected", reason });
                    res.end();
                }
            );
        } catch (error: any) {
            clearInterval(heartbeat);
            const status = error.message === 'UNAUTHORIZED' ? 401 : 500;
            sendEvent({ status: "error", error: error.message });
            res.end();
        }
    }

    /**
     * GET /api/whatsapp/status/:userId
     */
    static async getStatus(req: any, res: Response) {
        const userId = Number(req.params.userId || req.user?.id);
        const requesterId = Number(req.user?.id);

        const isConnected = whatsappSessionManager.isConnected(userId, requesterId);
        
        let phone = null;
        if (isConnected) {
            const sock = (whatsappSessionManager as any).sessions.get(userId);
            phone = sock?.user?.id ? `+${sock.user.id.split(':')[0]}` : null;
        }

        res.json({ connected: isConnected, phone });
    }

    /**
     * DELETE /api/whatsapp/disconnect/:userId
     */
    static async disconnect(req: any, res: Response) {
        const userId = Number(req.params.userId || req.user?.id);
        const requesterId = Number(req.user?.id);

        try {
            await whatsappSessionManager.disconnectWhatsApp(userId, requesterId);
            res.json({ success: true, message: 'Sesión desconectada exitosamente.' });
        } catch (error: any) {
            const code = error.message === 'UNAUTHORIZED' ? 401 : 500;
            res.status(code).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/whatsapp/send
     * Incluye Validación de Dueño, Audit Log y Rate Limiting (vía middleware)
     */
    static async send(req: any, res: Response) {
        const userId = Number(req.body.userId || req.user?.id);
        const requesterId = Number(req.user?.id);
        const { recipientPhone, message } = req.body;

        if (!recipientPhone || !message) {
            return res.status(400).json({ success: false, error: 'recipientPhone y message son obligatorios.' });
        }

        try {
            // 1. Validar que el recipiente pertenece al usuario (Aislamiento de datos)
            const cleanPhone = recipientPhone.replace(/\D/g, '');
            const client = await prisma.cliente.findFirst({
                where: {
                    id_administrador: userId,
                    telefono: { contains: cleanPhone.slice(-8) }
                }
            });

            if (!client) {
                await WhatsAppController.auditLog(userId, `WHATSAPP_SEND_FAIL: recipient=${recipientPhone} - RECIPIENT_NOT_OWNED`);
                return res.status(403).json({ success: false, error: 'RECIPIENT_NOT_OWNED: El cliente no te pertenece.' });
            }

            // 2. Intentar envío
            await whatsappSessionManager.sendMessage(userId, requesterId, recipientPhone, message);

            // 3. Persistir mensaje en historial
            const savedMsg = await (prisma as any).message.create({
                data: {
                    userId,
                    clientId: client.id,
                    content: message,
                    direction: 'outbound',
                    status: 'sent'
                }
            });

            // 4. Audit Log
            await WhatsAppController.auditLog(userId, `WHATSAPP_SEND_SUCCESS: msgId=${savedMsg.id}, recipient=${recipientPhone}`);

            res.json({ success: true, messageId: savedMsg.id });

        } catch (error: any) {
            const errorMessage = error.message;
            let statusCode = 500;

            if (errorMessage === 'UNAUTHORIZED') statusCode = 401;
            if (errorMessage === 'SESSION_NOT_FOUND') statusCode = 404;

            await WhatsAppController.auditLog(userId, `WHATSAPP_SEND_FAIL: recipient=${recipientPhone} - ${errorMessage}`);
            
            res.status(statusCode).json({ success: false, error: errorMessage });
        }
    }

    /**
     * Helper para logs de auditoría
     */
    private static async auditLog(userId: number, action: string) {
        try {
            await prisma.auditoria.create({
                data: {
                    usuario: `AdminID:${userId}`,
                    accion: action.substring(0, 100)
                }
            });
        } catch (e) {
            logger.error('Error escribiendo en tabla de auditoría:', e);
        }
    }
}
