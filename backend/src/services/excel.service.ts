import ExcelJS from 'exceljs';
import { prisma } from '../utils/prisma';

const PESO_CURRENCY_FORMAT = '[$$-es-AR] #,##0.00';
const BLUE_FILL = '4472C4';
const LIGHT_BLUE_FILL = 'D9E2F3';
const LIGHT_GREEN_FILL = 'E2F0D9';
const LIGHT_RED_FILL = 'FCE4D6';

const THIN_BORDER = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
};

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
    private static formatDate(value: Date | null | undefined): string {
        if (!value) {
            return '-';
        }

        return new Date(value).toLocaleDateString('es-ES');
    }

    private static formatCurrencyCell(cell: ExcelJS.Cell, value: number, bold = false): void {
        cell.value = Number(value ?? 0);
        cell.numFmt = PESO_CURRENCY_FORMAT;
        if (bold) {
            cell.font = { ...(cell.font ?? {}), bold: true };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    private static applyTableBorder(row: ExcelJS.Row, fromCol: number, toCol: number): void {
        for (let col = fromCol; col <= toCol; col++) {
            row.getCell(col).border = THIN_BORDER;
            row.getCell(col).alignment = { vertical: 'middle', horizontal: col === toCol ? 'right' : 'left' };
        }
    }

    private static styleBlueHeader(cell: ExcelJS.Cell): void {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: BLUE_FILL },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = THIN_BORDER;
    }

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
     * Genera el Excel de BALANCE DE CLIENTE con el layout solicitado.
     */
    static async generateBalanceExcel(clientId: number): Promise<Buffer> {
        const balanceData = await ExcelService.buildBalanceData(clientId);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'APL Laboratorio Dental';
        workbook.created = new Date();

        const resumenSheet = workbook.addWorksheet('Resumen');
        resumenSheet.mergeCells('A1:E1');
        resumenSheet.getCell('A1').value = 'BALANCE DE CLIENTE';
        ExcelService.styleBlueHeader(resumenSheet.getCell('A1'));
        resumenSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };

        const infoRows = [
            ['A2', 'Cliente:', 'B2', balanceData.cliente.nombre],
            ['A3', 'Email:', 'B3', balanceData.cliente.email],
            ['A4', 'Teléfono:', 'B4', balanceData.cliente.telefono],
        ] as const;

        infoRows.forEach(([labelCell, label, valueCell, value]) => {
            resumenSheet.getCell(labelCell).value = label;
            resumenSheet.getCell(labelCell).font = { bold: false };
            resumenSheet.getCell(valueCell).value = value;
        });

        resumenSheet.mergeCells('B2:E2');
        resumenSheet.mergeCells('B3:E3');
        resumenSheet.mergeCells('B4:E4');

        resumenSheet.mergeCells('A6:B6');
        resumenSheet.getCell('A6').value = 'RESUMEN FINANCIERO';
        ExcelService.styleBlueHeader(resumenSheet.getCell('A6'));

        resumenSheet.getCell('A7').value = 'Total Pedidos:';
        resumenSheet.getCell('B7').value = balanceData.resumen.totalPedidos;
        resumenSheet.getCell('B7').alignment = { horizontal: 'right', vertical: 'middle' };

        resumenSheet.getCell('A8').value = 'Monto Total:';
        ExcelService.formatCurrencyCell(resumenSheet.getCell('B8'), balanceData.resumen.montoTotal, true);

        resumenSheet.getCell('A9').value = 'Monto Pagado:';
        ExcelService.formatCurrencyCell(resumenSheet.getCell('B9'), balanceData.resumen.montoPagado);

        resumenSheet.getCell('A10').value = 'Monto Pendiente:';
        ExcelService.formatCurrencyCell(resumenSheet.getCell('B10'), balanceData.resumen.montoPendiente, true);

        for (let rowNumber = 2; rowNumber <= 10; rowNumber++) {
            ExcelService.applyTableBorder(resumenSheet.getRow(rowNumber), 1, 2);
        }

        resumenSheet.mergeCells('A12:E12');
        resumenSheet.getCell('A12').value = 'DETALLE PEDIDOS';
        ExcelService.styleBlueHeader(resumenSheet.getCell('A12'));

        const detailHeaderRow = resumenSheet.getRow(13);
        detailHeaderRow.values = ['Pedido #', 'Fecha Entrega', 'Paciente', 'Trabajo', 'Monto Total'];
        for (let col = 1; col <= 5; col++) {
            ExcelService.styleBlueHeader(detailHeaderRow.getCell(col));
        }
        detailHeaderRow.height = 20;

        let currentRow = 14;
        for (const pedido of balanceData.pedidos) {
            const firstDetail = pedido.detalles[0];
            const row = resumenSheet.getRow(currentRow);
            row.getCell(1).value = pedido.id;
            row.getCell(2).value = ExcelService.formatDate(pedido.fecha_entrega);
            row.getCell(3).value = firstDetail?.paciente || '-';
            row.getCell(4).value = firstDetail?.producto || '-';
            ExcelService.formatCurrencyCell(row.getCell(5), pedido.montoTotal);
            ExcelService.applyTableBorder(row, 1, 5);
            row.height = 20;
            currentRow++;
        }

        const totalRow = resumenSheet.getRow(currentRow);
        totalRow.getCell(1).value = 'TOTAL';
        totalRow.getCell(1).font = { bold: true };
        totalRow.getCell(5).value = balanceData.resumen.montoTotal;
        totalRow.getCell(5).numFmt = PESO_CURRENCY_FORMAT;
        totalRow.getCell(5).font = { bold: true };
        ExcelService.applyTableBorder(totalRow, 1, 5);
        for (let col = 1; col <= 5; col++) {
            totalRow.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_BLUE_FILL },
            };
        }

        currentRow++;
        const paidRow = resumenSheet.getRow(currentRow);
        paidRow.getCell(1).value = 'Monto pagado';
        paidRow.getCell(1).font = { bold: true };
        ExcelService.formatCurrencyCell(paidRow.getCell(5), balanceData.resumen.montoPagado, true);
        ExcelService.applyTableBorder(paidRow, 1, 5);
        for (let col = 1; col <= 5; col++) {
            paidRow.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_GREEN_FILL },
            };
        }

        currentRow++;
        const pendingRow = resumenSheet.getRow(currentRow);
        pendingRow.getCell(1).value = 'Monto pendiente';
        pendingRow.getCell(1).font = { bold: true };
        ExcelService.formatCurrencyCell(pendingRow.getCell(5), balanceData.resumen.montoPendiente, true);
        ExcelService.applyTableBorder(pendingRow, 1, 5);
        for (let col = 1; col <= 5; col++) {
            pendingRow.getCell(col).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: LIGHT_RED_FILL },
            };
        }

        resumenSheet.getColumn(1).width = 18;
        resumenSheet.getColumn(2).width = 28;
        resumenSheet.getColumn(3).width = 18;
        resumenSheet.getColumn(4).width = 20;
        resumenSheet.getColumn(5).width = 18;

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

        // ÚNICA HOJA: Resumen mensual (adjunto para enviar al cliente)
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

        // Título (como captura): nombre del cliente, merge A1:D1
        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = balanceData.cliente.nombre;
        sheet.getCell('A1').font = { size: 14, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // Encabezados de tabla (fila 3)
        const headerRowIndex = 3;
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
            sheet.getCell(rowIndex, 4).numFmt = PESO_CURRENCY_FORMAT;

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
        sheet.getCell(rowIndex, 4).numFmt = PESO_CURRENCY_FORMAT;

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
