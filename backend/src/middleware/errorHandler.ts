import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

/**
 * Middleware de manejo global de errores mejorado
 * Captura todos los errores, los registra con Winston y devuelve respuestas apropiadas
 */
export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log del error con contexto completo
  logger.error('Error capturado:', {
    message: err.message,
    name: err.name,
    code: err.code,
    status: err.status || err.statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Prisma errors - manejo detallado
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    
    switch (err.code) {
      case 'P2002':
        // Violación de unique constraint
        const target = (err.meta?.target as string[]) || [];
        message = `Ya existe un registro con ${target.join(', ')} duplicado`;
        break;
      case 'P2025':
        // Registro no encontrado
        message = 'Registro no encontrado';
        statusCode = 404;
        break;
      case 'P2003':
        // Foreign key constraint failed
        message = 'Error de integridad referencial - el registro está relacionado con otros datos';
        break;
      case 'P2014':
        // Relation constraint failed
        message = 'La relación entre registros no es válida';
        break;
      default:
        message = 'Error en la operación de base de datos';
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Error de validación en los datos proporcionados';
  }

  // Prisma connection errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Error de conexión con la base de datos';
    logger.error('⚠️ Error crítico de conexión a base de datos', { error: err });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticación inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token de autenticación expirado';
  }

  // Validation errors (de express-validator o similares)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación en los datos proporcionados';
  }

  // SyntaxError (JSON malformado)
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'JSON malformado en el cuerpo de la solicitud';
  }

  // Respuesta de error estructurada
  const errorResponse: any = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Incluir detalles adicionales en desarrollo
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      name: err.name,
      code: err.code,
      stack: err.stack
    };
  }

  res.status(statusCode).json(errorResponse);
};