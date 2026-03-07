import ExcelJS from 'exceljs';
import { prisma } from '../utils/prisma';

interface BalanceData {
    cliente: {
        id: number;
        nombre: string;
        email: string;
        telefono: string;
    };
    pedidos: Array<{
        id: number;
        fecha_pedido: Date;
        fecha_entrega: Date | null;
        montoTotal: number;
        montoPagado: number;
        montoPendiente: number;
        detalles: Array<{
            producto: string;
            paciente: string;
            cantidad: number;
            precio_unitario: number;
            subtotal: number;
        }>;
        pagos: Array<{
            fecha_pago: Date;
            valor: number;
        }>;
    }>;
    resumen: {
        montoTotal: number;
        montoPagado: number;
        montoPendiente: number;
        totalPedidos: number;
    };
}

export class ExcelService {
    private static async buildBalanceData(clientId: number): Promise<BalanceData> {
        // Obtener datos del cliente con todos sus pedidos y pagos
        const cliente = await prisma.cliente.findUnique({
            where: { id: clientId },
            include: {
                pedidos: {
                    where: { fecha_delete: null },
                    include: {
                        detalles: {
                            include: {
                                producto: true,
                                estado: true,
                            },
                        },
                        detallesPago: {
                            include: {
                                pago: true,
                            },
                        },
                    },
                    orderBy: { fecha_pedido: 'desc' },
                },
            },
        });

        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        // Calcular totales
        let montoTotalGeneral = 0;
        let montoPagadoGeneral = 0;

        const pedidosData = cliente.pedidos.map(pedido => {
            const montoTotal = pedido.detalles.reduce(
                (sum, det) => sum + (det.cantidad * Number(det.precio_unitario)),
                0
            );
            const montoPagado = pedido.detallesPago.reduce(
                (sum, det) => sum + Number(det.valor),
                0
            );
            const montoPendiente = montoTotal - montoPagado;

            montoTotalGeneral += montoTotal;
            montoPagadoGeneral += montoPagado;

            return {
                id: pedido.id,
                fecha_pedido: pedido.fecha_pedido,
                fecha_entrega: pedido.fecha_entrega,
                montoTotal,
                montoPagado,
                montoPendiente,
                detalles: pedido.detalles.map(det => ({
                    producto: det.producto.tipo,
                    paciente: det.paciente,
                    cantidad: det.cantidad,
                    precio_unitario: Number(det.precio_unitario),
                    subtotal: det.cantidad * Number(det.precio_unitario),
                })),
                pagos: pedido.detallesPago.map(dp => ({
                    fecha_pago: dp.fecha_pago,
                    valor: Number(dp.valor),
                })),
            };
        });

        const balanceData: BalanceData = {
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                email: cliente.email,
                telefono: cliente.telefono,
            },
            pedidos: pedidosData,
            resumen: {
                montoTotal: montoTotalGeneral,
                montoPagado: montoPagadoGeneral,
                montoPendiente: montoTotalGeneral - montoPagadoGeneral,
                totalPedidos: pedidosData.length,
            },
        };

        return balanceData;
    }

    /**
     * Genera el Excel de BALANCE (descarga) como estaba originalmente (múltiples hojas)
     */
    static async generateBalanceExcel(clientId: number): Promise<Buffer> {
        const balanceData = await ExcelService.buildBalanceData(clientId);

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'APL Laboratorio Dental';
        workbook.created = new Date();

        // Hoja 1: Resumen (BALANCE)
        const resumenSheet = workbook.addWorksheet('Resumen');

        // Título
        resumenSheet.mergeCells('A1:D1');
        resumenSheet.getCell('A1').value = 'BALANCE DE CLIENTE';
        resumenSheet.getCell('A1').font = { size: 16, bold: true };
        resumenSheet.getCell('A1').alignment = { horizontal: 'center' };

        // Información del cliente
        resumenSheet.getCell('A3').value = 'Cliente:';
        resumenSheet.getCell('B3').value = balanceData.cliente.nombre;
        resumenSheet.getCell('A4').value = 'Email:';
        resumenSheet.getCell('B4').value = balanceData.cliente.email;
        resumenSheet.getCell('A5').value = 'Teléfono:';
        resumenSheet.getCell('B5').value = balanceData.cliente.telefono;

        // Resumen financiero
        resumenSheet.getCell('A7').value = 'RESUMEN FINANCIERO';
        resumenSheet.getCell('A7').font = { bold: true, size: 12 };

        resumenSheet.getCell('A8').value = 'Total Pedidos:';
        resumenSheet.getCell('B8').value = balanceData.resumen.totalPedidos;

        resumenSheet.getCell('A9').value = 'Monto Total:';
        resumenSheet.getCell('B9').value = balanceData.resumen.montoTotal;
        resumenSheet.getCell('B9').numFmt = '$#,##0.00';
        resumenSheet.getCell('B9').font = { bold: true };

        resumenSheet.getCell('A10').value = 'Monto Pagado:';
        resumenSheet.getCell('B10').value = balanceData.resumen.montoPagado;
        resumenSheet.getCell('B10').numFmt = '$#,##0.00';

        resumenSheet.getCell('A11').value = 'Monto Pendiente:';
        resumenSheet.getCell('B11').value = balanceData.resumen.montoPendiente;
        resumenSheet.getCell('B11').numFmt = '$#,##0.00';
        resumenSheet.getCell('B11').font = { bold: true };

        // Ajustar anchos de columna
        resumenSheet.getColumn(1).width = 20;
        resumenSheet.getColumn(2).width = 30;

        // Hoja 2: Pedidos
        const pedidosSheet = workbook.addWorksheet('Pedidos');
        pedidosSheet.columns = [
            { header: 'Pedido #', key: 'id', width: 10 },
            { header: 'Fecha Pedido', key: 'fecha_pedido', width: 15 },
            { header: 'Fecha Entrega', key: 'fecha_entrega', width: 15 },
            { header: 'Monto Total', key: 'montoTotal', width: 15 },
            { header: 'Monto Pagado', key: 'montoPagado', width: 15 },
            { header: 'Monto Pendiente', key: 'montoPendiente', width: 15 },
        ];

        pedidosSheet.getRow(1).font = { bold: true };
        balanceData.pedidos.forEach(pedido => {
            pedidosSheet.addRow({
                id: pedido.id,
                fecha_pedido: pedido.fecha_pedido.toLocaleDateString('es-ES'),
                fecha_entrega: pedido.fecha_entrega ? pedido.fecha_entrega.toLocaleDateString('es-ES') : 'Pendiente',
                montoTotal: pedido.montoTotal,
                montoPagado: pedido.montoPagado,
                montoPendiente: pedido.montoPendiente,
            });
        });
        pedidosSheet.getColumn(4).numFmt = '$#,##0.00';
        pedidosSheet.getColumn(5).numFmt = '$#,##0.00';
        pedidosSheet.getColumn(6).numFmt = '$#,##0.00';

        // Hoja 3: Detalle Completo
        const detalleSheet = workbook.addWorksheet('Detalle Completo');
        let currentRow = 1;

        balanceData.pedidos.forEach((pedido) => {
            detalleSheet.mergeCells(`A${currentRow}:F${currentRow}`);
            detalleSheet.getCell(`A${currentRow}`).value = `PEDIDO #${pedido.id} - ${pedido.fecha_pedido.toLocaleDateString('es-ES')}`;
            detalleSheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
            currentRow++;

            detalleSheet.getCell(`A${currentRow}`).value = 'Producto';
            detalleSheet.getCell(`B${currentRow}`).value = 'Paciente';
            detalleSheet.getCell(`C${currentRow}`).value = 'Cantidad';
            detalleSheet.getCell(`D${currentRow}`).value = 'Precio Unit.';
            detalleSheet.getCell(`E${currentRow}`).value = 'Subtotal';
            detalleSheet.getRow(currentRow).font = { bold: true };
            currentRow++;

            pedido.detalles.forEach(detalle => {
                detalleSheet.getCell(`A${currentRow}`).value = detalle.producto;
                detalleSheet.getCell(`B${currentRow}`).value = detalle.paciente;
                detalleSheet.getCell(`C${currentRow}`).value = detalle.cantidad;
                detalleSheet.getCell(`D${currentRow}`).value = detalle.precio_unitario;
                detalleSheet.getCell(`E${currentRow}`).value = detalle.subtotal;
                detalleSheet.getCell(`D${currentRow}`).numFmt = '$#,##0.00';
                detalleSheet.getCell(`E${currentRow}`).numFmt = '$#,##0.00';
                currentRow++;
            });

            currentRow++;
            detalleSheet.getCell(`D${currentRow}`).value = 'Total:';
            detalleSheet.getCell(`E${currentRow}`).value = pedido.montoTotal;
            detalleSheet.getCell(`E${currentRow}`).numFmt = '$#,##0.00';
            detalleSheet.getCell(`E${currentRow}`).font = { bold: true };
            currentRow += 2;
        });

        detalleSheet.getColumn(1).width = 25;
        detalleSheet.getColumn(2).width = 20;
        detalleSheet.getColumn(3).width = 10;
        detalleSheet.getColumn(4).width = 15;
        detalleSheet.getColumn(5).width = 15;

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    }

    /**
     * Genera el Excel de RESUMEN MENSUAL (adjunto en emails): 1 hoja, layout solicitado
     */
    static async generateResumenMensualExcel(clientId: number): Promise<Buffer> {
        const balanceData = await ExcelService.buildBalanceData(clientId);

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'APL Laboratorio Dental';
        workbook.created = new Date();

        // ÚNICA HOJA: Resumen mensual (estilo Excel normal, sin tema oscuro)
        const sheet = workbook.addWorksheet('Resumen mensual', {
            views: [{ showGridLines: true }],
        });

        // Helpers
        const formatDM = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
        const gridBorder = {
            top: { style: 'thin' as const },
            left: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            right: { style: 'thin' as const },
        };

        // Columnas
        sheet.columns = [
            { key: 'fecha', width: 18 },
            { key: 'paciente', width: 28 },
            { key: 'trabajo', width: 28 },
            { key: 'importe', width: 14 },
        ];

        // Título (como captura): centrado, grande, merge A1:D1
        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = 'RESUMEN MENSUAL';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // Info del cliente (como captura)
        sheet.getCell('A3').value = 'Cliente:';
        sheet.getCell('B3').value = balanceData.cliente.nombre;
        sheet.getCell('A4').value = 'Email:';
        sheet.getCell('B4').value = balanceData.cliente.email;
        sheet.getCell('A5').value = 'Teléfono:';
        sheet.getCell('B5').value = balanceData.cliente.telefono;
        for (const r of [3, 4, 5]) {
            sheet.getCell(r, 1).font = { bold: true };
        }

        // Encabezados de tabla (fila 7)
        const headerRowIndex = 7;
        const headerRow = sheet.getRow(headerRowIndex);
        headerRow.values = ['Fecha de entrega', 'Paciente', 'Trabajo', 'Importe'];
        headerRow.height = 20;

        for (let col = 1; col <= 4; col++) {
            const c = sheet.getCell(headerRowIndex, col);
            c.font = { bold: true };
            c.alignment = { vertical: 'middle', horizontal: 'left' };
            c.border = gridBorder;
        }

        // Flatten + ordenar por fecha de entrega asc
        type RowItem = {
            fechaEntregaKey: string;
            fechaEntregaSort: number;
            fechaEntregaLabel: string;
            paciente: string;
            trabajo: string;
            importe: number;
        };

        const rows: RowItem[] = [];
        for (const p of balanceData.pedidos) {
            const fechaEntrega = p.fecha_entrega ? new Date(p.fecha_entrega) : null;
            const fechaEntregaLabel = fechaEntrega ? formatDM(fechaEntrega) : '-';
            const fechaEntregaSort = fechaEntrega ? fechaEntrega.getTime() : Number.MAX_SAFE_INTEGER;
            const fechaEntregaKey = fechaEntregaLabel;

            for (const d of p.detalles) {
                rows.push({
                    fechaEntregaKey,
                    fechaEntregaSort,
                    fechaEntregaLabel,
                    paciente: String(d.paciente ?? '').trim() || '-',
                    trabajo: String(d.producto ?? '').trim() || '-',
                    importe: Number(d.subtotal ?? 0),
                });
            }
        }

        rows.sort((a, b) => a.fechaEntregaSort - b.fechaEntregaSort);

        // Render tabla (desde fila 8)
        let rowIndex = headerRowIndex + 1;
        let runningTotal = 0;
        let lastFechaKey: string | null = null;

        for (const r of rows) {
            const isFirstOfGroup = lastFechaKey !== r.fechaEntregaKey;
            const dateCellValue = isFirstOfGroup ? r.fechaEntregaLabel : '';
            lastFechaKey = r.fechaEntregaKey;

            sheet.getCell(rowIndex, 1).value = dateCellValue;
            sheet.getCell(rowIndex, 2).value = r.paciente;
            sheet.getCell(rowIndex, 3).value = r.trabajo;
            sheet.getCell(rowIndex, 4).value = r.importe;
            sheet.getCell(rowIndex, 4).numFmt = '0';

            for (let col = 1; col <= 4; col++) {
                const c = sheet.getCell(rowIndex, col);
                c.alignment = {
                    vertical: 'middle',
                    horizontal: col === 4 ? 'right' : 'left',
                };
                c.border = gridBorder;
            }

            runningTotal += Number(r.importe || 0);
            rowIndex++;
        }

        // Total (normal) en columnas C-D
        sheet.getCell(rowIndex, 3).value = 'Total';
        sheet.getCell(rowIndex, 4).value = runningTotal;
        sheet.getCell(rowIndex, 4).numFmt = '0';

        for (let col = 1; col <= 4; col++) {
            const c = sheet.getCell(rowIndex, col);
            c.border = gridBorder;
            c.font = { bold: col >= 3 };
            c.alignment = { vertical: 'middle', horizontal: col === 4 ? 'right' : 'left' };
        }

        // Borde alrededor del título (opcional, ayuda a que quede prolijo como captura)
        sheet.getCell('A1').border = gridBorder;

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    }
}
