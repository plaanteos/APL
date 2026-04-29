import { IClient, IBalanceItem } from "../types";

interface PrintableReceiptProps {
  client: IClient;
  orders: IBalanceItem[];
  selectedOrderIds: number[];
  issuedBy: string;
}

const formatDate = (value: unknown) => {
  try {
    return new Date(value as string).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(value ?? "-");
  }
};

const formatMoney = (value: number) =>
  `$${Number(value ?? 0).toLocaleString("es-ES")}`;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildReceiptHtml = ({ client, orders, selectedOrderIds, issuedBy }: PrintableReceiptProps) => {
  const selectedOrders = orders.filter((order) =>
    selectedOrderIds.includes(order.pedidoId)
  );

  const totalAmount = selectedOrders.reduce(
    (sum, order) => sum + Number(order.montoTotal ?? 0),
    0
  );
  const paidAmount = selectedOrders.reduce(
    (sum, order) => sum + Number(order.montoPagado ?? 0),
    0
  );
  const now = new Date();
  const issuedAt = `${now.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} - ${now.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const dash = "- - - - - - - - - - - - - - - - - - - - - -";

  const orderRows = selectedOrders
    .map((order) => {
      const status = order.entregado
        ? "Entregado"
        : Number(order.montoPendiente ?? 0) > 0
          ? "Pendiente"
          : "Pagado";

      return `
<p class="row-patient">${escapeHtml(order.paciente || "Paciente sin nombre")}<span class="status">${escapeHtml(status)}</span></p>
<p class="meta">${escapeHtml(formatDate(order.fecha))}</p>
<p class="work">${escapeHtml(order.productos || "Trabajo sin detalle")}</p>
<div class="amts">
  <span>Total:</span><span>${escapeHtml(formatMoney(order.montoTotal))}</span>
</div>
<div class="amts">
  <span>Pagado:</span><span>${escapeHtml(formatMoney(order.montoPagado))}</span>
</div>
<p class="dash">${dash}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprobante APL</title>
  <style>
    /*
     * Ticket térmico — compatible con rollos de 58mm y 80mm.
     * @page sin 'size' fijo: el driver de la impresora usa el ancho real del papel.
     * En pantalla se muestra una vista previa a 72mm (80mm roll preview).
     */
    @page {
      margin: 2mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      background: #eee;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
    }

    /* ── Vista previa en pantalla ── */
    body {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }
    .ticket {
      width: 72mm;          /* preview 80mm roll */
      background: #fff;
      padding: 10px 10px;
      border: 1px dashed #aaa;
      box-shadow: 0 2px 12px rgba(0,0,0,.15);
    }

    /* ── Tipografía ── */
    .center { text-align: center; }
    .bold { font-weight: bold; }

    .title-main {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.08em;
    }
    .title-sub {
      font-size: 10px;
      text-align: center;
      margin-top: 2px;
      letter-spacing: 0.04em;
    }
    .doc-title {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin: 6px 0 2px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .issued-by { font-size: 10px; text-align: center; margin: 1px 0 2px; }
    .date { font-size: 10px; text-align: center; margin-bottom: 4px; }

    /* separadores de guiones: usan ch para ancho monoespaciado */
    .dash {
      font-size: 10px;
      color: #444;
      text-align: center;
      margin: 4px 0;
      overflow: hidden;
      white-space: nowrap;
    }

    .label { font-size: 10px; color: #333; margin-bottom: 1px; }
    .client-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
    .meta { font-size: 10px; color: #333; margin: 1px 0; }

    .row-patient {
      font-size: 11px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 4px;
      margin: 6px 0 1px;
    }
    .status { font-weight: normal; font-size: 10px; flex-shrink: 0; }
    .work { font-size: 11px; font-weight: bold; margin: 3px 0 1px; }
    .amts {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 1px 0;
    }

    .total-section { margin-top: 3px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: bold;
      border-top: 1px solid #000;
      padding-top: 3px;
      margin: 2px 0;
    }
    .paid-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 2px 0;
    }

    .count { font-size: 10px; text-align: center; margin: 3px 0; }
    .footer-text { font-size: 10px; font-weight: bold; text-align: center; margin: 2px 0; }
    .footer-legal { font-size: 9px; text-align: center; color: #444; margin-top: 2px; font-style: italic; }

    /* ── Impresión real (58mm o 80mm — el driver define el ancho) ── */
    @media print {
      html, body {
        background: white;
        padding: 0;
        margin: 0;
        width: 100%;
      }
      .ticket {
        width: 100%;      /* ocupa todo el ancho del papel */
        border: 0;
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <p class="title-main">APL DENTAL</p>
    <p class="title-sub">Laboratorio Protésico</p>
    <p class="dash">${dash}</p>
    <p class="doc-title">Comprobante de Pedidos</p>
    <p class="issued-by">Emitido por: ${escapeHtml(issuedBy)}</p>
    <p class="date">${escapeHtml(issuedAt)}</p>
    <p class="dash">${dash}</p>
    <p class="label">Cliente:</p>
    <p class="client-name">${escapeHtml(client.nombre)}</p>
    <p class="meta">Tel:${escapeHtml(client.telefono || "No registrado")}</p>
    <p class="meta">Email:${escapeHtml(client.email || "No registrado")}</p>
    <p class="dash">${dash}</p>
    ${orderRows || `<p class="meta" style="text-align:center">No hay pedidos seleccionados.</p><p class="dash">${dash}</p>`}
    <div class="total-section">
      <div class="total-row"><span>TOTAL:</span><span>${escapeHtml(formatMoney(totalAmount))}</span></div>
      <div class="paid-row"><span>Total Pagado:</span><span>${escapeHtml(formatMoney(paidAmount))}</span></div>
    </div>
    <p class="dash">${dash}</p>
    <p class="count">${escapeHtml(selectedOrders.length)} pedido${selectedOrders.length !== 1 ? "s" : ""}</p>
    <p class="dash">${dash}</p>
    <p class="footer-text bold">Gracias por confiar en APL Dental</p>
    <p class="footer-legal">Este comprobante fue generado automáticamente</p>
  </div>
  <script>
    window.onload = () => { window.focus(); setTimeout(() => window.print(), 150); };
    window.onafterprint = () => window.close();
  </script>
</body>
</html>`;
};

export const printReceipt = (props: PrintableReceiptProps) => {
  const printWindow = window.open("", "apl-print-receipt", "width=340,height=720,scrollbars=yes");
  if (!printWindow) {
    throw new Error("No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó el popup.");
  }

  printWindow.focus();
  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(props));
  printWindow.document.close();
};
