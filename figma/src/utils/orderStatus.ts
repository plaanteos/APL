import type { IOrderWithCalculations } from "../app/types";

export function normalizeOrderStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export type PedidoStatus = "PENDIENTE" | "EN_PROCESO" | "ENTREGADO" | "ENTREGADO_CON_DEUDA" | "PAGADO";

function getDetalleEstadoDescripcion(detalle: any): string {
  return (
    String(detalle?.estado?.descripcion ?? "").trim() ||
    String(detalle?.estadoDescripcion ?? "").trim() ||
    ""
  );
}

export function getPedidoStatus(order: IOrderWithCalculations): PedidoStatus {
  const detalles = order.detalles || [];

  if (detalles.length === 0) return "PENDIENTE";

  const statuses = detalles
    .map((d: any) => normalizeOrderStatus(getDetalleEstadoDescripcion(d)))
    .filter(Boolean);

  // Estado final: todos entregados Y sin deuda pendiente
  const allEntregado = statuses.length > 0 && statuses.every((s) => s === "ENTREGADO");
  if (allEntregado) {
    return Number(order.montoPendiente ?? 0) > 0 ? "ENTREGADO_CON_DEUDA" : "ENTREGADO";
  }

  // Pagado: todos los detalles marcados como "pagado" (aún no entregado)
  const allPagado = statuses.length > 0 && statuses.every((s) => s === "PAGADO");
  if (allPagado) return "PAGADO";

  // En proceso: algún detalle en producción o listo
  if (statuses.some((s) => s === "EN_PROCESO" || s === "LISTO_PARA_ENTREGA")) return "EN_PROCESO";

  return "PENDIENTE";
}

export function isOrderFullyDelivered(order: IOrderWithCalculations): boolean {
  const status = getPedidoStatus(order);
  return status === "ENTREGADO" || status === "ENTREGADO_CON_DEUDA";
}

/** Pedidos no totalmente pagados (saldo pendiente > 0). Mismo criterio que el filtro "Pendientes". */
export function isPedidoPendienteLista(order: IOrderWithCalculations): boolean {
  return Number(order.montoPendiente ?? 0) > 0;
}
