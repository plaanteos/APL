import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

/**
 * Servicio de Auditoría - Modelo Oficial APL
 * Tabla auditoria: id, usuario, fecha_accion, accion
 * - Sin relaciones con otras tablas
 * - Solo registra acciones con texto descriptivo
 */
export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   * @param usuario - Nombre de usuario o email del administrador
   * @param accion - Descripción de la acción realizada
   */
  static async log(usuario: string, accion: string): Promise<void> {
    try {
      await prisma.auditoria.create({
        data: {
          usuario,
          accion,
        },
      });
    } catch (error) {
      // No lanzar error para no interferir con la operación principal
      console.error('Error registrando auditoría:', error);
    }
  }

  /**
   * Extrae información de usuario del request autenticado
   */
  static extractUsuario(req: Request): string {
    const user = (req as any).user;
    return user?.email || user?.usuario || 'sistema';
  }

  /**
   * Registra login exitoso
   */
  static async logLogin(req: Request, usuario: string, email: string): Promise<void> {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    await this.log(
      usuario,
      `LOGIN exitoso - ${email} desde ${ip}`
    );
  }

  /**
   * Registra logout
   */
  static async logLogout(usuario: string, email?: string): Promise<void> {
    await this.log(
      usuario,
      `LOGOUT - ${email || usuario}`
    );
  }

  /**
   * Registra creación de cliente
   */
  static async logClientCreated(req: Request, clienteId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `CREAR Cliente - ID: ${clienteId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra actualización de cliente
   */
  static async logClientUpdated(req: Request, clienteId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Cliente - ID: ${clienteId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra eliminación de cliente
   */
  static async logClientDeleted(req: Request, clienteId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Cliente - ID: ${clienteId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra creación de pedido
   */
  static async logOrderCreated(req: Request, pedidoId: number, clienteNombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `CREAR Pedido - ID: ${pedidoId}, Cliente: ${clienteNombre}`
    );
  }

  /**
   * Registra actualización de pedido
   */
  static async logOrderUpdated(req: Request, pedidoId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Pedido - ID: ${pedidoId}`
    );
  }

  /**
   * Registra eliminación de pedido
   */
  static async logOrderDeleted(req: Request, pedidoId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Pedido - ID: ${pedidoId}`
    );
  }

  /**
   * Registra adición de detalle a pedido
   */
  static async logOrderDetailAdded(req: Request, pedidoId: number, productoNombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `AGREGAR Detalle a Pedido - ID Pedido: ${pedidoId}, Producto: ${productoNombre}`
    );
  }

  /**
   * Registra actualización de detalle de pedido
   */
  static async logOrderDetailUpdated(req: Request, pedidoId: number, detalleId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Detalle de Pedido - ID Pedido: ${pedidoId}, ID Detalle: ${detalleId}`
    );
  }

  /**
   * Registra eliminación de detalle de pedido
   */
  static async logOrderDetailDeleted(req: Request, pedidoId: number, detalleId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Detalle de Pedido - ID Pedido: ${pedidoId}, ID Detalle: ${detalleId}`
    );
  }

  /**
   * Registra creación de pago
   */
  static async logPaymentCreated(req: Request, pagoId: number, valor: number, numPedidos: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `CREAR Pago - ID: ${pagoId}, Valor: $${valor}, Aplicado a ${numPedidos} pedido(s)`
    );
  }

  /**
   * Registra aplicación de pago a pedido específico
   */
  static async logPaymentAppliedToOrder(req: Request, pagoId: number, pedidoId: number, valor: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `APLICAR Pago a Pedido - ID Pago: ${pagoId}, ID Pedido: ${pedidoId}, Valor: $${valor}`
    );
  }

  /**
   * Registra actualización de pago
   */
  static async logPaymentUpdated(req: Request, pagoId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Pago - ID: ${pagoId}`
    );
  }

  /**
   * Registra eliminación de pago
   */
  static async logPaymentDeleted(req: Request, pagoId: number): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Pago - ID: ${pagoId}`
    );
  }

  /**
   * Registra creación de producto
   */
  static async logProductCreated(req: Request, productoId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `CREAR Producto - ID: ${productoId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra actualización de producto
   */
  static async logProductUpdated(req: Request, productoId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Producto - ID: ${productoId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra eliminación de producto
   */
  static async logProductDeleted(req: Request, productoId: number, nombre: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Producto - ID: ${productoId}, Nombre: ${nombre}`
    );
  }

  /**
   * Registra creación de estado
   */
  static async logStateCreated(req: Request, estadoId: number, estado: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `CREAR Estado - ID: ${estadoId}, Estado: ${estado}`
    );
  }

  /**
   * Registra actualización de estado
   */
  static async logStateUpdated(req: Request, estadoId: number, estado: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ACTUALIZAR Estado - ID: ${estadoId}, Estado: ${estado}`
    );
  }

  /**
   * Registra eliminación de estado
   */
  static async logStateDeleted(req: Request, estadoId: number, estado: string): Promise<void> {
    const usuario = this.extractUsuario(req);
    await this.log(
      usuario,
      `ELIMINAR Estado - ID: ${estadoId}, Estado: ${estado}`
    );
  }

  /**
   * Obtiene logs de auditoría con paginación
   */
  static async getLogs(
    limit: number = 100,
    skip: number = 0
  ): Promise<any[]> {
    return await prisma.auditoria.findMany({
      take: limit,
      skip: skip,
      orderBy: {
        fecha_accion: 'desc',
      },
    });
  }

  /**
   * Obtiene logs filtrados por usuario
   */
  static async getLogsByUsuario(
    usuario: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    return await prisma.auditoria.findMany({
      where: {
        usuario: {
          contains: usuario,
        },
      },
      take: limit,
      skip,
      orderBy: {
        fecha_accion: 'desc',
      },
    });
  }

  /**
   * Obtiene logs filtrados por acción
   */
  static async getLogsByAccion(
    accionPattern: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any[]> {
    return await prisma.auditoria.findMany({
      where: {
        accion: {
          contains: accionPattern,
        },
      },
      take: limit,
      skip,
      orderBy: {
        fecha_accion: 'desc',
      },
    });
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getStats(days: number = 7): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByUser: Record<string, number>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.auditoria.findMany({
      where: {
        fecha_accion: {
          gte: since,
        },
      },
    });

    // Agrupar por tipo de acción (primera palabra del campo accion)
    const logsByAction: Record<string, number> = {};
    const logsByUser: Record<string, number> = {};

    logs.forEach((log) => {
      // Extraer tipo de acción (primera palabra: CREATE, UPDATE, DELETE, LOGIN, etc.)
      const actionType = log.accion.split(' ')[0];
      logsByAction[actionType] = (logsByAction[actionType] || 0) + 1;

      // Contar por usuario
      logsByUser[log.usuario] = (logsByUser[log.usuario] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      logsByAction,
      logsByUser,
    };
  }

  /**
   * Limpia logs antiguos (mantiene solo los últimos N días)
   */
  static async cleanOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditoria.deleteMany({
      where: {
        fecha_accion: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
