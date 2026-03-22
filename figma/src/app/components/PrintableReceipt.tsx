import { IClient, IBalanceItem } from "../types";

interface PrintableReceiptProps {
  client: IClient;
  orders: IBalanceItem[];
  selectedOrderIds: number[];
}

export function PrintableReceipt({
  client,
  orders,
  selectedOrderIds,
}: PrintableReceiptProps) {
  const selectedOrders = orders.filter((order) =>
    selectedOrderIds.includes(order.pedidoId)
  );

  const totalAmount = selectedOrders.reduce(
    (sum, order) => sum + order.montoTotal,
    0
  );
  const paidAmount = selectedOrders.reduce(
    (sum, order) => sum + order.montoPagado,
    0
  );
  const pendingAmount = selectedOrders.reduce(
    (sum, order) => sum + order.montoPendiente,
    0
  );

  const formatDate = (value: any) => {
    try {
      return new Date(value).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  };

  const formatCurrency = (value: number) =>
    `$${Number(value ?? 0).toLocaleString("es-ES")}`;

  return (
    <div className="hidden print:block">
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
            }
          }
        `}
      </style>

      <div className="w-[80mm] mx-auto bg-white p-4 font-mono text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <h1 className="text-xl font-bold mb-1">APL DENTAL</h1>
          <p className="text-xs text-gray-700">Laboratorio Protésico</p>
        </div>

        {/* Comprobante Info */}
        <div className="text-center mb-3 pb-3 border-b border-dashed border-gray-300">
          <p className="text-base font-bold mb-1">COMPROBANTE DE PEDIDOS</p>
          <p className="text-xs text-gray-600">
            {new Date().toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            -{" "}
            {new Date().toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Client Info */}
        <div className="mb-3 pb-3 border-b border-dashed border-gray-300 text-xs">
          <div className="mb-1">
            <span className="text-gray-600">Cliente:</span>
            <p className="font-bold">{client.nombre}</p>
          </div>
          {client.telefono && (
            <div className="mb-1">
              <span className="text-gray-600">Tel:</span>
              <span className="ml-1">{client.telefono}</span>
            </div>
          )}
          {client.email && (
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-1 break-all">{client.email}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mb-3 pb-3 border-b-2 border-dashed border-gray-400">
          {selectedOrders.map((order, index) => {
            const remaining = order.montoPendiente;
            return (
              <div
                key={order.pedidoId}
                className={`mb-3 pb-3 ${
                  index < selectedOrders.length - 1
                    ? "border-b border-dotted border-gray-300"
                    : ""
                }`}
              >
                {/* Item Header */}
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-bold text-xs">{order.paciente || "—"}</p>
                    <p className="text-xs text-gray-600">{formatDate(order.fecha)}</p>
                  </div>
                  <span className="text-xs bg-gray-200 px-1 py-0.5 rounded">
                    {order.entregado ? "Entregado" : remaining > 0 ? "Pendiente" : "Pagado"}
                  </span>
                </div>

                {/* Item Details */}
                <div className="text-xs mb-2">
                  <p className="text-gray-600">{order.productos}</p>
                </div>

                {/* Item Amounts */}
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold">
                      {formatCurrency(order.montoTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pagado:</span>
                    <span>{formatCurrency(order.montoPagado)}</span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Falta:</span>
                      <span>{formatCurrency(remaining)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mb-3 pb-3 border-b-2 border-gray-900 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-bold">TOTAL:</span>
            <span className="font-bold">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between mb-1 text-xs">
            <span className="text-gray-600">Total Pagado:</span>
            <span>{formatCurrency(paidAmount)}</span>
          </div>
          {pendingAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Total Pendiente:</span>
              <span className="font-semibold">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Items Count */}
        <div className="text-center text-xs text-gray-600 mb-3">
          {selectedOrders.length} pedido{selectedOrders.length !== 1 ? "s" : ""}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 border-t border-dashed border-gray-300 pt-3">
          <p className="mb-2">Gracias por confiar en APL Dental</p>
          <p className="text-[10px]">
            Este comprobante fue generado automáticamente
          </p>
        </div>
      </div>
    </div>
  );
}
