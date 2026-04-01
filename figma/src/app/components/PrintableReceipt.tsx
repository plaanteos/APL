import { IClient, IBalanceItem } from "../types";

interface PrintableReceiptProps {
  client: IClient;
  orders: IBalanceItem[];
  selectedOrderIds: number[];
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

const buildReceiptHtml = ({ client, orders, selectedOrderIds }: PrintableReceiptProps) => {
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
  const pendingAmount = selectedOrders.reduce(
    (sum, order) => sum + Number(order.montoPendiente ?? 0),
    0
  );

  const rows = selectedOrders
    .map((order) => {
      const status = order.entregado
        ? "Entregado"
        : Number(order.montoPendiente ?? 0) > 0
          ? "Pendiente"
          : "Pagado";

      return `
        <section class="order-block">
          <div class="order-head">
            <div>
              <p class="patient">${escapeHtml(order.paciente || "Paciente sin nombre")}</p>
              <p class="meta">Pedido #${escapeHtml(order.pedidoId)} · ${escapeHtml(formatDate(order.fecha))}</p>
            </div>
            <span class="badge">${escapeHtml(status)}</span>
          </div>
          <p class="work">${escapeHtml(order.productos || "Trabajo sin detalle")}</p>
          <div class="amount-grid">
            <div><span>Total</span><strong>${escapeHtml(formatMoney(order.montoTotal))}</strong></div>
            <div><span>Pagado</span><strong>${escapeHtml(formatMoney(order.montoPagado))}</strong></div>
            <div><span>Pendiente</span><strong>${escapeHtml(formatMoney(order.montoPendiente))}</strong></div>
          </div>
        </section>
      `;
    })
    .join("");

  const now = new Date();
  const issuedAt = `${now.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} · ${now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Comprobante APL</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 6mm;
        }

        :root {
          color-scheme: light;
          --ink: #12344d;
          --muted: #60758a;
          --line: #d8e2ea;
          --paper: #ffffff;
          --accent: #0f766e;
          --accent-soft: #e6f7f4;
          --warn: #8c6b11;
          --warn-soft: #fff5d6;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #eef3f7;
          font-family: "Segoe UI", Arial, sans-serif;
          color: var(--ink);
        }

        body {
          display: flex;
          justify-content: center;
          padding: 24px 0;
        }

        .ticket {
          width: 68mm;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 18px;
          box-shadow: 0 18px 45px rgba(18, 52, 77, 0.15);
          overflow: hidden;
        }

        .topbar {
          padding: 16px 16px 14px;
          background: linear-gradient(180deg, #103d5c 0%, #1a5b82 100%);
          color: white;
          text-align: center;
        }

        .brand {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.18em;
          margin: 0;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.82;
        }

        .content {
          padding: 14px;
        }

        .section + .section {
          margin-top: 14px;
        }

        .label {
          margin: 0 0 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .document-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          text-align: center;
        }

        .issued-at {
          margin: 6px 0 0;
          text-align: center;
          font-size: 11px;
          color: var(--muted);
        }

        .client-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          background: #f9fbfc;
        }

        .client-name {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 800;
        }

        .client-meta {
          margin: 0;
          font-size: 11px;
          line-height: 1.55;
          color: var(--muted);
          word-break: break-word;
        }

        .order-block {
          border: 1px dashed var(--line);
          border-radius: 14px;
          padding: 12px;
          background: white;
        }

        .order-block + .order-block {
          margin-top: 10px;
        }

        .order-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
        }

        .patient {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
        }

        .meta {
          margin: 3px 0 0;
          font-size: 10px;
          color: var(--muted);
        }

        .badge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 9px;
          font-weight: 800;
          background: var(--accent-soft);
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .work {
          margin: 10px 0;
          font-size: 11px;
          line-height: 1.5;
        }

        .amount-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .amount-grid div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: var(--muted);
        }

        .amount-grid strong {
          color: var(--ink);
          font-size: 11px;
        }

        .summary {
          border-radius: 16px;
          padding: 12px;
          background: linear-gradient(180deg, #f4f8fb 0%, #eef4f8 100%);
          border: 1px solid var(--line);
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          color: var(--muted);
        }

        .summary-row + .summary-row {
          margin-top: 7px;
        }

        .summary-row.total {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
          font-size: 14px;
          font-weight: 900;
          color: var(--ink);
        }

        .summary-row.pending strong {
          color: var(--warn);
        }

        .footer {
          padding: 0 14px 14px;
          text-align: center;
        }

        .footer-box {
          border-top: 1px dashed var(--line);
          padding-top: 12px;
        }

        .thanks {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
        }

        .legal {
          margin: 6px 0 0;
          font-size: 9px;
          color: var(--muted);
          line-height: 1.5;
        }

        @media print {
          html,
          body {
            background: white;
            padding: 0;
          }

          .ticket {
            width: 100%;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <main class="ticket">
        <header class="topbar">
          <p class="brand">APL DENTAL</p>
          <p class="subtitle">Comprobante de pedidos</p>
        </header>

        <section class="content">
          <div class="section">
            <p class="document-title">Recibo de balance</p>
            <p class="issued-at">Emitido ${escapeHtml(issuedAt)}</p>
          </div>

          <div class="section client-card">
            <p class="label">Cliente</p>
            <p class="client-name">${escapeHtml(client.nombre)}</p>
            <p class="client-meta">Tel: ${escapeHtml(client.telefono || "No registrado")}</p>
            <p class="client-meta">Email: ${escapeHtml(client.email || "No registrado")}</p>
          </div>

          <div class="section">
            <p class="label">Detalle</p>
            ${rows || '<section class="order-block"><p class="work">No hay pedidos seleccionados.</p></section>'}
          </div>

          <div class="section summary">
            <div class="summary-row">
              <span>Pedidos incluidos</span>
              <strong>${escapeHtml(selectedOrders.length)}</strong>
            </div>
            <div class="summary-row">
              <span>Total abonado</span>
              <strong>${escapeHtml(formatMoney(paidAmount))}</strong>
            </div>
            <div class="summary-row pending">
              <span>Total pendiente</span>
              <strong>${escapeHtml(formatMoney(pendingAmount))}</strong>
            </div>
            <div class="summary-row total">
              <span>Total general</span>
              <strong>${escapeHtml(formatMoney(totalAmount))}</strong>
            </div>
          </div>
        </section>

        <footer class="footer">
          <div class="footer-box">
            <p class="thanks">Gracias por confiar en APL Dental</p>
            <p class="legal">Documento generado automaticamente desde el modulo de balance.</p>
          </div>
        </footer>
      </main>
      <script>
        window.onload = () => {
          window.focus();
          setTimeout(() => window.print(), 150);
        };
        window.onafterprint = () => window.close();
      </script>
    </body>
  </html>`;
};

export const printReceipt = (props: PrintableReceiptProps) => {
  const printWindow = window.open("", "_blank", "width=420,height=840,noopener,noreferrer");
  if (!printWindow) {
    throw new Error("No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó el popup.");
  }

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(props));
  printWindow.document.close();
};
