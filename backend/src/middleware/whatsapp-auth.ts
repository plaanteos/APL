import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import logger from '../utils/logger';

/**
 * Middleware para asegurar aislamiento de usuario en WhatsApp.
 * Verifica que el userId solicitado corresponda al usuario autenticado en el JWT.
 */
export const validateWhatsAppOwnership = (req: any, res: Response, next: NextFunction) => {
    try {
        const authenticatedUserId = Number(req.user?.id);
        
        // El userId puede venir en el cuerpo, parámetros o query (para SSE)
        const requestedUserId = Number(req.body?.userId || req.params?.userId || req.query?.userId);

        if (!authenticatedUserId) {
            return res.status(401).json({ 
                success: false, 
                error: 'UNAUTHORIZED: No se encontró sesión de usuario válida.' 
            });
        }

        if (requestedUserId && requestedUserId !== authenticatedUserId) {
            logger.warn(`Intento de acceso cruzado: Usuario ${authenticatedUserId} intentó acceder a recursos de ${requestedUserId}`);
            return res.status(403).json({ 
                success: false, 
                error: 'FORBIDDEN: No tienes permiso para acceder a esta sesión de WhatsApp.' 
            });
        }

        // Si no se proporcionó requestedUserId, asumimos el del token para mayor seguridad
        if (!requestedUserId) {
            if (req.body) req.body.userId = authenticatedUserId;
            if (req.params) req.params.userId = authenticatedUserId.toString();
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Limitador de tasa: Máximo 60 mensajes por minuto por userId/IP.
 */
export const whatsappRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // Límite de 60 mensajes
    keyGenerator: (req: any) => {
        if (req.user?.id) return req.user.id.toString();
        return ipKeyGenerator(req);
    },
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED: Límite de 60 mensajes por minuto alcanzado.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
