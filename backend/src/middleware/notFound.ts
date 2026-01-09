import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // Enviar respuesta 404 directamente en lugar de crear un error
  res.status(404).json({
    success: false,
    error: 'Recurso no encontrado',
    path: req.originalUrl,
    method: req.method
  });
};