// Importación híbrida para máxima compatibilidad en producción (Render)

// Importación recomendada para Baileys >=6.x (solo desde el paquete principal)
const { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { makeInMemoryStore } = require('@whiskeysockets/baileys/lib/Store/makeInMemoryStore');

import { Boom } from '@hapi/boom';
import pino from 'pino';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

import { encrypt, decrypt } from '../utils/encryption';

/**
 * WhatsAppSessionManager
 * Maneja múltiples sesiones de WhatsApp usando Baileys y persiste en base de datos.
 * 
 * Fixes aplicados:
 * - FIX #1: Bug makeWASocket tercer fallback incorrecto
 * - FIX #2: Reconexión automática ahora reutiliza callbacks guardados
 * - FIX #3: Cleanup de callbacks en disconnectWhatsApp (evita memory leak)
 * - FIX #4: Race condition prevenida con Set "connecting"
 * - FIX #5: loadSessionsFromDB con delay entre conexiones para no saturar
 * - EXTRA: getPhoneNumber() para el endpoint de status
 */
class WhatsAppSessionManager {
    private sessions = new Map<number, any>();
    private stores = new Map<number, any>();
    private qrCallbacks = new Map<number, (qr: string) => void>();
    private readyCallbacks = new Map<number, () => void>();
    private disconnectCallbacks = new Map<number, (reason: string) => void>();

    // FIX #4: Set para prevenir race condition de conexiones duplicadas
    private connecting = new Set<number>();

    constructor() {
        // El manager se inicializa vacío.
    }

    /**
     * Inicializa las sesiones guardadas en la base de datos al arrancar.
     * FIX #5: Delay de 1.5s entre cada conexión para no saturar el servidor.
     */
    async loadSessionsFromDB() {
        try {
            const savedSessions = await (prisma as any).whatsAppSession.findMany();
            logger.info(`Cargando ${savedSessions.length} sesiones de WhatsApp con encriptación...`);

            for (const sess of savedSessions) {
                const sessionPath = path.join(process.cwd(), 'whatsapp_sessions', `auth_info_${sess.userId}`);
                if (!fs.existsSync(sessionPath)) {
                    fs.mkdirSync(sessionPath, { recursive: true });
                }

                // Desencriptar datos
                const encryptedData = sess.sessionData as any;
                if (encryptedData?.payload) {
                    try {
                        const decrypted = decrypt(encryptedData.payload);
                        const sessionData = JSON.parse(decrypted);

                        for (const [filename, content] of Object.entries(sessionData)) {
                            const filePath = path.join(sessionPath, filename);
                            fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));
                        }
                    } catch (err) {
                        logger.error(`Error de desencriptación para usuario ${sess.userId}. Datos corruptos o llave incorrecta.`);
                        continue;
                    }
                }

                // FIX #5: Esperar 1.5s entre cada reconexión para no saturar
                await new Promise(r => setTimeout(r, 1500));

                this.connectWhatsApp(sess.userId).catch(err => {
                    logger.error(`Error reconectando usuario ${sess.userId}:`, err);
                });
            }
        } catch (error) {
            logger.error('Error al cargar sesiones de la DB:', error);
        }
    }

    /**
     * Conecta una sesión de WhatsApp para un usuario específico.
     * FIX #4: Previene race condition con this.connecting Set.
     */
    async connectWhatsApp(
        userId: number,
        requesterId?: number,
        onQR?: (qr: string) => void,
        onReady?: () => void,
        onDisconnect?: (reason: string) => void
    ): Promise<any> {
        // Validación de aislamiento estricto
        if (requesterId && userId !== requesterId) {
            throw new Error('UNAUTHORIZED');
        }

        if (onQR) this.qrCallbacks.set(userId, onQR);
        if (onReady) this.readyCallbacks.set(userId, onReady);
        if (onDisconnect) this.disconnectCallbacks.set(userId, onDisconnect);

        // FIX #4: Evitar conexiones duplicadas si ya está conectado o conectando
        if (this.sessions.has(userId) || this.connecting.has(userId)) return;

        this.connecting.add(userId);

        try {
            logger.info(`Iniciando conexión segura para usuario ID: ${userId}`);

            const sessionPath = path.join(process.cwd(), 'whatsapp_sessions', `auth_info_${userId}`);
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version,
                printQRInTerminal: false,
                auth: state,
                logger: pino({ level: 'silent' }) as any,
                browser: ['APL Secure Connector', 'Chrome', '1.0.0']
            });

            const store = makeInMemoryStore({});
            store.bind(sock.ev);
            this.stores.set(userId, store);
            this.sessions.set(userId, sock);

            sock.ev.on('connection.update', async (update: any) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) this.qrCallbacks.get(userId)?.(qr);

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.sessions.delete(userId);
                    this.disconnectCallbacks.get(userId)?.(lastDisconnect?.error?.message || 'Disconnected');

                    if (shouldReconnect) {
                        // FIX #2: Reutilizar callbacks guardados al reconectar
                        this.connectWhatsApp(
                            userId,
                            undefined,
                            this.qrCallbacks.get(userId),
                            this.readyCallbacks.get(userId),
                            this.disconnectCallbacks.get(userId)
                        );
                    } else {
                        // Usuario hizo logout: limpiar todo
                        await (prisma as any).whatsAppSession.deleteMany({ where: { userId } });
                        fs.rmSync(sessionPath, { recursive: true, force: true });

                        // FIX #3: Limpiar callbacks al hacer logout
                        this.qrCallbacks.delete(userId);
                        this.readyCallbacks.delete(userId);
                        this.disconnectCallbacks.delete(userId);
                    }
                } else if (connection === 'open') {
                    await this.syncSessionToDB(userId, sessionPath);
                    this.readyCallbacks.get(userId)?.();
                }
            });

            sock.ev.on('creds.update', async () => {
                await saveCreds();
                await this.syncSessionToDB(userId, sessionPath);
            });

            return sock;

        } finally {
            // FIX #4: Siempre liberar el lock de connecting
            this.connecting.delete(userId);
        }
    }

    /**
     * Sincroniza y ENCRIPTA la sesión en la base de datos.
     */
    private async syncSessionToDB(userId: number, sessionPath: string) {
        try {
            const files = fs.readdirSync(sessionPath);
            const sessionDataRaw: any = {};

            for (const file of files) {
                const fullPath = path.join(sessionPath, file);
                if (fs.lstatSync(fullPath).isFile()) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    try {
                        sessionDataRaw[file] = JSON.parse(content);
                    } catch {
                        sessionDataRaw[file] = content;
                    }
                }
            }

            const encryptedPayload = encrypt(JSON.stringify(sessionDataRaw));

            await (prisma as any).whatsAppSession.upsert({
                where: { userId },
                update: { sessionData: { payload: encryptedPayload } },
                create: { userId, sessionData: { payload: encryptedPayload } }
            });
        } catch (error) {
            logger.error(`Error sincronizando/encriptando sesión para ${userId}:`, error);
        }
    }

    /**
     * Envía un mensaje con validación de aislamiento.
     */
    async sendMessage(userId: number, requesterId: number, phoneNumber: string, message: string) {
        if (userId !== requesterId) throw new Error('UNAUTHORIZED');

        const sock = this.sessions.get(userId);
        if (!sock) throw new Error('SESSION_NOT_FOUND');

        const jid = `${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
    }

    /**
     * Desconecta y elimina datos con validación.
     * FIX #3: Limpia callbacks para evitar memory leak.
     */
    async disconnectWhatsApp(userId: number, requesterId: number) {
        if (userId !== requesterId) throw new Error('UNAUTHORIZED');

        const sock = this.sessions.get(userId);
        if (sock) {
            try { await sock.logout(); } catch (e) { }
        }

        this.sessions.delete(userId);
        this.stores.delete(userId);

        // FIX #3: Limpiar callbacks al desconectar
        this.qrCallbacks.delete(userId);
        this.readyCallbacks.delete(userId);
        this.disconnectCallbacks.delete(userId);

        await (prisma as any).whatsAppSession.deleteMany({ where: { userId } });

        const sessionPath = path.join(process.cwd(), 'whatsapp_sessions', `auth_info_${userId}`);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
    }

    /**
     * Retorna si el usuario tiene sesión activa.
     */
    isConnected(userId: number, requesterId: number): boolean {
        if (userId !== requesterId) return false;
        return this.sessions.has(userId);
    }

    /**
     * EXTRA: Retorna el número de teléfono conectado del usuario.
     * Útil para el endpoint GET /api/whatsapp/status/:userId
     */
    getPhoneNumber(userId: number, requesterId: number): string | null {
        if (userId !== requesterId) return null;
        const sock = this.sessions.get(userId);
        return sock?.user?.id?.split(':')[0] ?? null;
    }
}

export const whatsappSessionManager = new WhatsAppSessionManager();