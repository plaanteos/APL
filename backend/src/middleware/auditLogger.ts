import { Request, Response, NextFunction } from 'express';
import { AuditService, EntityType, AuditAction } from '../services/audit.service';

/**
 * Middleware para auditoría automática de operaciones
 * Registra automáticamente las operaciones CRUD en el sistema
 */

interface AuditConfig {
  entityType: EntityType;
  action?: AuditAction;
  getEntityId?: (req: Request, res: Response) => string;
  getOldData?: (req: Request) => Promise<any>;
  getNewData?: (req: Request, res: Response) => any;
  description?: (req: Request, res: Response) => string;
}

/**
 * Middleware de auditoría que registra automáticamente las operaciones
 */
export function auditLog(config: AuditConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Guardar el método original de res.json
    const originalJson = res.json.bind(res);
    let responseData: any;

    // Interceptar la respuesta
    res.json = function (data: any): Response {
      responseData = data;
      return originalJson(data);
    };

    // Guardar el método original de res.send
    const originalSend = res.send.bind(res);
    res.send = function (data: any): Response {
      if (!responseData) {
        responseData = data;
      }
      return originalSend(data);
    };

    // Cuando la respuesta termina, registrar en auditoría
    res.on('finish', async () => {
      try {
        // Solo auditar operaciones exitosas (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const userId = (req as any).user?.id;
          
          if (!userId) return; // No auditar si no hay usuario autenticado

          // Determinar acción según el método HTTP si no se especifica
          let action = config.action;
          if (!action) {
            switch (req.method) {
              case 'POST':
                action = 'CREAR';
                break;
              case 'PUT':
              case 'PATCH':
                action = 'ACTUALIZAR';
                break;
              case 'DELETE':
                action = 'ELIMINAR';
                break;
              default:
                return; // No auditar GET u otros métodos
            }
          }

          // Obtener ID de la entidad
          let entityId: string;
          if (config.getEntityId) {
            entityId = config.getEntityId(req, res);
          } else if (req.params.id) {
            entityId = req.params.id;
          } else if (responseData?.data?.id) {
            entityId = responseData.data.id;
          } else {
            entityId = 'unknown';
          }

          // Obtener datos anteriores (para actualizaciones/eliminaciones)
          let oldData: any = null;
          if (config.getOldData && (action === 'ACTUALIZAR' || action === 'ELIMINAR')) {
            try {
              oldData = await config.getOldData(req);
            } catch (error) {
              console.error('Error obteniendo datos anteriores para auditoría:', error);
            }
          }

          // Obtener datos nuevos
          let newData: any = null;
          if (config.getNewData) {
            newData = config.getNewData(req, res);
          } else if (action === 'CREAR' || action === 'ACTUALIZAR') {
            newData = req.body;
          }

          // Descripción personalizada
          let description: string | undefined;
          if (config.description) {
            description = config.description(req, res);
          }

          // Registrar en auditoría
          const { ip, userAgent } = AuditService.extractRequestInfo(req);

          await AuditService.log({
            administradorId: userId,
            accion: action,
            tipoEntidad: config.entityType,
            entidadId: entityId,
            valoresAnteriores: oldData,
            valoresNuevos: newData,
            descripcion: description,
            direccionIP: ip,
            userAgent: userAgent,
          });
        }
      } catch (error) {
        // No lanzar error para no interferir con la operación principal
        console.error('Error en middleware de auditoría:', error);
      }
    });

    next();
  };
}

/**
 * Middleware específico para auditar creación de clientes
 */
export const auditClientCreate = auditLog({
  entityType: 'cliente',
  action: 'CREAR',
  description: (req) => `Cliente creado: ${req.body.nombre}`,
});

/**
 * Middleware específico para auditar actualización de clientes
 */
export const auditClientUpdate = auditLog({
  entityType: 'cliente',
  action: 'ACTUALIZAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Cliente actualizado: ${req.params.id}`,
});

/**
 * Middleware específico para auditar eliminación de clientes
 */
export const auditClientDelete = auditLog({
  entityType: 'cliente',
  action: 'ELIMINAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Cliente eliminado: ${req.params.id}`,
});

/**
 * Middleware específico para auditar creación de pedidos
 */
export const auditOrderCreate = auditLog({
  entityType: 'pedido',
  action: 'CREAR',
  description: (req) => `Pedido creado para paciente: ${req.body.nombrePaciente}`,
});

/**
 * Middleware específico para auditar actualización de pedidos
 */
export const auditOrderUpdate = auditLog({
  entityType: 'pedido',
  action: 'ACTUALIZAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Pedido actualizado: ${req.params.id}`,
});

/**
 * Middleware específico para auditar cambio de estado de pedidos
 */
export const auditOrderStatusChange = auditLog({
  entityType: 'pedido',
  action: 'CAMBIO_ESTADO',
  getEntityId: (req) => req.params.id,
  description: (req) => `Estado de pedido cambiado a: ${req.body.estado}`,
});

/**
 * Middleware específico para auditar eliminación de pedidos
 */
export const auditOrderDelete = auditLog({
  entityType: 'pedido',
  action: 'ELIMINAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Pedido eliminado: ${req.params.id}`,
});

/**
 * Middleware específico para auditar registro de pagos
 */
export const auditPaymentCreate = auditLog({
  entityType: 'pago',
  action: 'CREAR',
  description: (req) => `Pago registrado por monto: ${req.body.monto} - Método: ${req.body.metodoPago}`,
});

/**
 * Middleware específico para auditar actualización de pagos
 */
export const auditPaymentUpdate = auditLog({
  entityType: 'pago',
  action: 'ACTUALIZAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Pago actualizado: ${req.params.id}`,
});

/**
 * Middleware específico para auditar eliminación de pagos
 */
export const auditPaymentDelete = auditLog({
  entityType: 'pago',
  action: 'ELIMINAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Pago eliminado: ${req.params.id}`,
});

/**
 * Middleware para auditar operaciones de administradores
 */
export const auditAdminCreate = auditLog({
  entityType: 'administrador',
  action: 'CREAR',
  description: (req) => `Administrador creado: ${req.body.email}`,
});

export const auditAdminUpdate = auditLog({
  entityType: 'administrador',
  action: 'ACTUALIZAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Administrador actualizado: ${req.params.id}`,
});

export const auditAdminDelete = auditLog({
  entityType: 'administrador',
  action: 'ELIMINAR',
  getEntityId: (req) => req.params.id,
  description: (req) => `Administrador eliminado: ${req.params.id}`,
});
