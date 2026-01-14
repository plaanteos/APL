import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Modelo Oficial APL - Tipos actualizados
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    super_usuario: boolean;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acceso denegado. No se proporcionó token.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado.'
    });
  }
};

export const requireSuperUser = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Acceso denegado. Usuario no autenticado.'
      });
    }

    if (!req.user.super_usuario) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de super usuario.'
      });
    }

    next();
  };
};

// Exportación con nombres antiguos para compatibilidad temporal
export const authenticate = authMiddleware;