import { ExcelService } from '../services/excel.service';

export const BALANCE_XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function loadBalanceExcelForClient(
  balanceClientId: number,
  balanceClientName: string | undefined
): Promise<{ buffer: Buffer; filename: string }> {
  const buffer = await ExcelService.generateResumenMensualExcel(balanceClientId);
  const safeName = String(balanceClientName || `cliente_${balanceClientId}`)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '');
  const date = new Date().toISOString().split('T')[0];
  const filename = `Resumen_mensual_${safeName || `cliente_${balanceClientId}`}_${date}.xlsx`;
  return { buffer, filename };
}
