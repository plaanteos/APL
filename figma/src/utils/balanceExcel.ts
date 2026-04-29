import ExcelJS from 'exceljs';
import { IOrderWithCalculations } from '../app/types';
import { IOtherExpense } from '../services/expense.service';

type BalancePeriod = 'monthly' | 'yearly';

type ExpenseSummary = {
  total: number;
  totalInsumos: number;
  totalCadeteria: number;
};

type DownloadBalancePeriodExcelParams = {
  period: BalancePeriod;
  monthValue: string;
  yearValue: string;
  orders: IOrderWithCalculations[];
  expenses: IOtherExpense[];
  expenseSummary: ExpenseSummary | null;
};

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CURRENCY_FORMAT = '[$$-es-AR] #,##0.00';
const BLUE_FILL = '4472C4';
const LIGHT_BLUE_FILL = 'D9E2F3';
const MONTH_NAMES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const THIN_BORDER = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: unknown): string => {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString('es-ES') : '-';
};

const setCurrency = (cell: ExcelJS.Cell, value: number, bold = false): void => {
  cell.value = Number(value ?? 0);
  cell.numFmt = CURRENCY_FORMAT;
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  if (bold) {
    cell.font = { ...(cell.font ?? {}), bold: true };
  }
};

const styleBlueCell = (cell: ExcelJS.Cell): void => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BLUE_FILL },
  };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = THIN_BORDER;
};

const styleRangeBorder = (row: ExcelJS.Row, fromCol: number, toCol: number): void => {
  for (let col = fromCol; col <= toCol; col++) {
    row.getCell(col).border = THIN_BORDER;
    row.getCell(col).alignment = { horizontal: col === toCol ? 'right' : 'left', vertical: 'middle' };
  }
};

const normalizeExpenseType = (value: string | undefined): 'Insumos' | 'Cadetería' => {
  return value === 'delivery' ? 'Cadetería' : 'Insumos';
};

const getClientName = (order: IOrderWithCalculations): string => {
  const anyOrder = order as IOrderWithCalculations & {
    nombreCliente?: string;
    clienteNombre?: string;
    nombre_cliente?: string;
    fecha?: string | Date;
  };

  return String(
    order.cliente?.nombre || anyOrder.nombreCliente || anyOrder.clienteNombre || anyOrder.nombre_cliente || `Cliente ${order.id_cliente}`
  ).trim();
};

const getOrderDate = (order: IOrderWithCalculations): Date | null => {
  const anyOrder = order as IOrderWithCalculations & { fecha?: string | Date };
  return parseDate(order.fecha_pedido || anyOrder.fecha);
};

const getOrderMonthIndex = (order: IOrderWithCalculations): number | null => {
  const date = getOrderDate(order);
  return date ? date.getMonth() : null;
};

const autoFitColumns = (sheet: ExcelJS.Worksheet, widths: number[]): void => {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
};

const buildSummaryBlock = (
  sheet: ExcelJS.Worksheet,
  income: number,
  expenseSummary: ExpenseSummary | null
): void => {
  const expenses = expenseSummary?.total ?? 0;
  const balance = income - expenses;

  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'BALANCE';
  styleBlueCell(sheet.getCell('A1'));

  const headerRow = sheet.getRow(2);
  headerRow.values = [
    'Concepto',
    'Total Ingresos',
    'Total Egresos - Insumos',
    'Total Egresos - Cadetería',
    'Total Egresos',
    'Balance',
  ];
  headerRow.height = 32;
  for (let col = 1; col <= 6; col++) {
    styleBlueCell(headerRow.getCell(col));
  }

  const amountRow = sheet.getRow(3);
  amountRow.getCell(1).value = 'Monto';
  setCurrency(amountRow.getCell(2), income);
  setCurrency(amountRow.getCell(3), expenseSummary?.totalInsumos ?? 0);
  setCurrency(amountRow.getCell(4), expenseSummary?.totalCadeteria ?? 0);
  setCurrency(amountRow.getCell(5), expenses);
  setCurrency(amountRow.getCell(6), balance);
  styleRangeBorder(amountRow, 1, 6);
};

const buildMonthlySheet = (
  sheet: ExcelJS.Worksheet,
  orders: IOrderWithCalculations[],
  expenses: IOtherExpense[],
  expenseSummary: ExpenseSummary | null
): void => {
  const income = orders.reduce((acc, order) => acc + Number(order.montoPagado ?? 0), 0);
  buildSummaryBlock(sheet, income, expenseSummary);
  autoFitColumns(sheet, [18, 24, 22, 22, 18, 18]);

  sheet.mergeCells('A5:E5');
  sheet.getCell('A5').value = 'PEDIDOS - INGRESOS';
  styleBlueCell(sheet.getCell('A5'));

  const orderHeader = sheet.getRow(6);
  orderHeader.values = ['Fecha del pedido', 'Cliente', 'Total', 'Pagado', 'Pendiente'];
  orderHeader.height = 22;
  for (let col = 1; col <= 5; col++) {
    styleBlueCell(orderHeader.getCell(col));
  }

  const sortedOrders = [...orders].sort((left, right) => {
    const leftTime = getOrderDate(left)?.getTime() ?? 0;
    const rightTime = getOrderDate(right)?.getTime() ?? 0;
    return leftTime - rightTime;
  });

  let rowIndex = 7;
  let totalAmount = 0;
  let totalPaid = 0;
  let totalPending = 0;

  sortedOrders.forEach((order) => {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = formatDate(order.fecha_pedido);
    row.getCell(2).value = getClientName(order);
    setCurrency(row.getCell(3), Number(order.montoTotal ?? 0));
    setCurrency(row.getCell(4), Number(order.montoPagado ?? 0));
    setCurrency(row.getCell(5), Number(order.montoPendiente ?? 0));
    styleRangeBorder(row, 1, 5);
    totalAmount += Number(order.montoTotal ?? 0);
    totalPaid += Number(order.montoPagado ?? 0);
    totalPending += Number(order.montoPendiente ?? 0);
    rowIndex++;
  });

  const totalRow = sheet.getRow(rowIndex);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  setCurrency(totalRow.getCell(3), totalAmount, true);
  setCurrency(totalRow.getCell(4), totalPaid, true);
  setCurrency(totalRow.getCell(5), totalPending, true);
  styleRangeBorder(totalRow, 1, 5);
  for (let col = 1; col <= 5; col++) {
    totalRow.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_BLUE_FILL },
    };
  }

  rowIndex += 2;
  sheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = 'GASTOS - EGRESOS';
  styleBlueCell(sheet.getCell(`A${rowIndex}`));
  rowIndex++;

  const expenseHeader = sheet.getRow(rowIndex);
  expenseHeader.values = ['Fecha', 'Tipo', 'Descripción', 'Monto'];
  expenseHeader.height = 22;
  for (let col = 1; col <= 4; col++) {
    styleBlueCell(expenseHeader.getCell(col));
  }
  rowIndex++;

  expenses.forEach((expense) => {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = formatDate(expense.fecha);
    row.getCell(2).value = normalizeExpenseType(expense.tipo);
    row.getCell(3).value = expense.descripcion;
    setCurrency(row.getCell(4), Number(expense.monto ?? 0));
    styleRangeBorder(row, 1, 4);
    rowIndex++;
  });

  const expenseTotalRow = sheet.getRow(rowIndex);
  expenseTotalRow.getCell(1).value = 'TOTAL';
  expenseTotalRow.getCell(1).font = { bold: true };
  setCurrency(expenseTotalRow.getCell(4), expenseSummary?.total ?? 0, true);
  styleRangeBorder(expenseTotalRow, 1, 4);
  for (let col = 1; col <= 4; col++) {
    expenseTotalRow.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_BLUE_FILL },
    };
  }
};

const buildAnnualSheet = (
  sheet: ExcelJS.Worksheet,
  orders: IOrderWithCalculations[],
  expenses: IOtherExpense[],
  expenseSummary: ExpenseSummary | null
): void => {
  const income = orders.reduce((acc, order) => acc + Number(order.montoPagado ?? 0), 0);
  buildSummaryBlock(sheet, income, expenseSummary);
  autoFitColumns(sheet, [26, 18, 18, 18, 16, 16, 16, 16, 16, 16, 16, 16, 16]);

  sheet.mergeCells('A5:M5');
  sheet.getCell('A5').value = 'PEDIDOS - INGRESOS';
  styleBlueCell(sheet.getCell('A5'));

  const orderHeader = sheet.getRow(6);
  orderHeader.values = ['Cliente', ...MONTH_NAMES];
  orderHeader.height = 22;
  for (let col = 1; col <= 13; col++) {
    styleBlueCell(orderHeader.getCell(col));
  }

  const ordersByClient = new Map<string, number[]>();
  orders.forEach((order) => {
    const clientName = getClientName(order);
    const monthIndex = getOrderMonthIndex(order);
    if (monthIndex == null) return;
    const current = ordersByClient.get(clientName) ?? Array.from({ length: 12 }, () => 0);
    current[monthIndex] += Number(order.montoPagado ?? 0);
    ordersByClient.set(clientName, current);
  });

  let rowIndex = 7;
  const totalsByMonth = Array.from({ length: 12 }, () => 0);
  [...ordersByClient.entries()].sort(([left], [right]) => left.localeCompare(right, 'es')).forEach(([clientName, totals]) => {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = clientName;
    totals.forEach((value, monthIndex) => {
      totalsByMonth[monthIndex] += value;
      row.getCell(monthIndex + 2).value = value > 0 ? value : '-';
      if (value > 0) {
        row.getCell(monthIndex + 2).numFmt = CURRENCY_FORMAT;
      }
    });
    styleRangeBorder(row, 1, 13);
    rowIndex++;
  });

  const totalRow = sheet.getRow(rowIndex);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalsByMonth.forEach((value, monthIndex) => {
    totalRow.getCell(monthIndex + 2).value = value > 0 ? value : '-';
    if (value > 0) {
      totalRow.getCell(monthIndex + 2).numFmt = CURRENCY_FORMAT;
      totalRow.getCell(monthIndex + 2).font = { bold: true };
    }
  });
  styleRangeBorder(totalRow, 1, 13);
  for (let col = 1; col <= 13; col++) {
    totalRow.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_BLUE_FILL },
    };
  }

  rowIndex += 2;
  sheet.mergeCells(`A${rowIndex}:M${rowIndex}`);
  sheet.getCell(`A${rowIndex}`).value = 'GASTOS - EGRESOS';
  styleBlueCell(sheet.getCell(`A${rowIndex}`));
  rowIndex++;

  const expenseHeader = sheet.getRow(rowIndex);
  expenseHeader.values = ['Tipo', ...MONTH_NAMES];
  expenseHeader.height = 22;
  for (let col = 1; col <= 13; col++) {
    styleBlueCell(expenseHeader.getCell(col));
  }
  rowIndex++;

  const expenseBuckets = {
    Insumos: Array.from({ length: 12 }, () => 0),
    Cadetería: Array.from({ length: 12 }, () => 0),
  };

  expenses.forEach((expense) => {
    const date = parseDate(expense.fecha);
    if (!date) return;
    const type = normalizeExpenseType(expense.tipo);
    expenseBuckets[type][date.getMonth()] += Number(expense.monto ?? 0);
  });

  (['Insumos', 'Cadetería'] as const).forEach((type) => {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = type;
    expenseBuckets[type].forEach((value, monthIndex) => {
      row.getCell(monthIndex + 2).value = value > 0 ? value : '-';
      if (value > 0) {
        row.getCell(monthIndex + 2).numFmt = CURRENCY_FORMAT;
      }
    });
    styleRangeBorder(row, 1, 13);
    rowIndex++;
  });

  const annualExpenseTotalRow = sheet.getRow(rowIndex);
  annualExpenseTotalRow.getCell(1).value = 'TOTAL';
  annualExpenseTotalRow.getCell(1).font = { bold: true };
  MONTH_NAMES.forEach((_, monthIndex) => {
    const total = expenseBuckets.Insumos[monthIndex] + expenseBuckets.Cadetería[monthIndex];
    annualExpenseTotalRow.getCell(monthIndex + 2).value = total > 0 ? total : '-';
    if (total > 0) {
      annualExpenseTotalRow.getCell(monthIndex + 2).numFmt = CURRENCY_FORMAT;
      annualExpenseTotalRow.getCell(monthIndex + 2).font = { bold: true };
    }
  });
  styleRangeBorder(annualExpenseTotalRow, 1, 13);
  for (let col = 1; col <= 13; col++) {
    annualExpenseTotalRow.getCell(col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT_BLUE_FILL },
    };
  }
};

export async function downloadBalancePeriodExcel({
  period,
  monthValue,
  yearValue,
  orders,
  expenses,
  expenseSummary,
}: DownloadBalancePeriodExcelParams): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APL Laboratorio Dental';
  workbook.created = new Date();

  const sheetName = period === 'monthly' ? 'Balance_Mensual' : 'Balance_Anual';
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  if (period === 'monthly') {
    buildMonthlySheet(sheet, orders, expenses, expenseSummary);
  } else {
    buildAnnualSheet(sheet, orders, expenses, expenseSummary);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: MIME_XLSX });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = period === 'monthly'
    ? `Balance_Mensual_${monthValue}.xlsx`
    : `Balance_Anual_${yearValue}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}