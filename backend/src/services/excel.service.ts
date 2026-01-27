import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    /**
     * Genera un archivo Excel con el balance de un cliente
     */
    static async generateBalanceExcel(clientId: number): Promise<Buffer> {
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

        // Crear libro de Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'APL Laboratorio Dental';
        workbook.created = new Date();

        // Hoja 1: Resumen
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
        resumenSheet.getCell('B10').font = { color: { argb: '00008000' } };

        resumenSheet.getCell('A11').value = 'Monto Pendiente:';
        resumenSheet.getCell('B11').value = balanceData.resumen.montoPendiente;
        resumenSheet.getCell('B11').numFmt = '$#,##0.00';
        resumenSheet.getCell('B11').font = {
            bold: true,
            color: { argb: balanceData.resumen.montoPendiente > 0 ? 'FFFF0000' : '00008000' }
        };

        // Ajustar anchos de columna
        resumenSheet.getColumn(1).width = 20;
        resumenSheet.getColumn(2).width = 30;

        // Hoja 2: Detalle de Pedidos
        const pedidosSheet = workbook.addWorksheet('Pedidos');

        // Encabezados
        pedidosSheet.columns = [
            { header: 'Pedido #', key: 'id', width: 10 },
            { header: 'Fecha Pedido', key: 'fecha_pedido', width: 15 },
            { header: 'Fecha Entrega', key: 'fecha_entrega', width: 15 },
            { header: 'Monto Total', key: 'montoTotal', width: 15 },
            { header: 'Monto Pagado', key: 'montoPagado', width: 15 },
            { header: 'Monto Pendiente', key: 'montoPendiente', width: 15 },
        ];

        // Estilo de encabezados
        pedidosSheet.getRow(1).font = { bold: true };
        pedidosSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF033f63' },
        };
        pedidosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Agregar datos de pedidos
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

        // Formato de moneda
        pedidosSheet.getColumn(4).numFmt = '$#,##0.00';
        pedidosSheet.getColumn(5).numFmt = '$#,##0.00';
        pedidosSheet.getColumn(6).numFmt = '$#,##0.00';

        // Hoja 3: Detalle Completo
        const detalleSheet = workbook.addWorksheet('Detalle Completo');

        let currentRow = 1;

        balanceData.pedidos.forEach((pedido, index) => {
            // Título del pedido
            detalleSheet.mergeCells(`A${currentRow}:F${currentRow}`);
            detalleSheet.getCell(`A${currentRow}`).value = `PEDIDO #${pedido.id} - ${pedido.fecha_pedido.toLocaleDateString('es-ES')}`;
            detalleSheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
            detalleSheet.getCell(`A${currentRow}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' },
            };
            currentRow++;

            // Encabezados de detalles
            detalleSheet.getCell(`A${currentRow}`).value = 'Producto';
            detalleSheet.getCell(`B${currentRow}`).value = 'Paciente';
            detalleSheet.getCell(`C${currentRow}`).value = 'Cantidad';
            detalleSheet.getCell(`D${currentRow}`).value = 'Precio Unit.';
            detalleSheet.getCell(`E${currentRow}`).value = 'Subtotal';
            detalleSheet.getRow(currentRow).font = { bold: true };
            currentRow++;

            // Detalles del pedido
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

            // Totales del pedido
            currentRow++;
            detalleSheet.getCell(`D${currentRow}`).value = 'Total:';
            detalleSheet.getCell(`E${currentRow}`).value = pedido.montoTotal;
            detalleSheet.getCell(`E${currentRow}`).numFmt = '$#,##0.00';
            detalleSheet.getCell(`E${currentRow}`).font = { bold: true };
            currentRow++;

            detalleSheet.getCell(`D${currentRow}`).value = 'Pagado:';
            detalleSheet.getCell(`E${currentRow}`).value = pedido.montoPagado;
            detalleSheet.getCell(`E${currentRow}`).numFmt = '$#,##0.00';
            detalleSheet.getCell(`E${currentRow}`).font = { color: { argb: '00008000' } };
            currentRow++;

            detalleSheet.getCell(`D${currentRow}`).value = 'Pendiente:';
            detalleSheet.getCell(`E${currentRow}`).value = pedido.montoPendiente;
            detalleSheet.getCell(`E${currentRow}`).numFmt = '$#,##0.00';
            detalleSheet.getCell(`E${currentRow}`).font = {
                bold: true,
                color: { argb: pedido.montoPendiente > 0 ? 'FFFF0000' : '00008000' }
            };
            currentRow += 2;
        });

        // Ajustar anchos
        detalleSheet.getColumn(1).width = 25;
        detalleSheet.getColumn(2).width = 20;
        detalleSheet.getColumn(3).width = 10;
        detalleSheet.getColumn(4).width = 15;
        detalleSheet.getColumn(5).width = 15;

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    }
}
