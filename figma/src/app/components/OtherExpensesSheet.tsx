import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Package, Truck, Filter, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import expenseService, { IOtherExpense } from "../../services/expense.service";

interface OtherExpensesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OtherExpensesSheet({
  open,
  onOpenChange,
}: OtherExpensesSheetProps) {
  const [expenses, setExpenses] = useState<IOtherExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "supplies" | "delivery">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await expenseService.getAll();
      setExpenses(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Error al cargar gastos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadExpenses();
    }
  }, [open, loadExpenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filterType !== "all" && expense.tipo !== filterType) return false;

      if (startDate || endDate) {
        const expenseDate = new Date(expense.fecha);
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (expenseDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59");
          if (expenseDate > end) return false;
        }
      }

      return true;
    });
  }, [expenses, filterType, startDate, endDate]);

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.monto, 0);
  const hasActiveFilters = filterType !== "all" || startDate || endDate;

  const clearFilters = () => {
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("es-ES");
    } catch {
      return isoString;
    }
  };

  const getExpenseIcon = (tipo: "supplies" | "delivery") =>
    tipo === "supplies" ? (
      <Package size={16} className="text-[#033f63]" />
    ) : (
      <Truck size={16} className="text-[#28666e]" />
    );

  const getExpenseTypeText = (tipo: "supplies" | "delivery") =>
    tipo === "supplies" ? "Insumos" : "Cadetería";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[#033f63]">Otros Gastos</SheetTitle>
          <SheetDescription>
            Resumen de insumos y gastos de cadetería del cliente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1 pb-4">
          {/* Total Card */}
          <Card className="p-4 bg-gradient-to-r from-[#033f63] to-[#28666e] border-0">
            <p className="text-sm text-white/80 mb-1">Total en Otros Gastos</p>
            <p className="text-2xl text-white font-medium">
              ${totalExpenses.toLocaleString("es-ES")}
            </p>
            {filteredExpenses.length < expenses.length && (
              <p className="text-xs text-white/70 mt-2">
                {filteredExpenses.length} de {expenses.length} gastos
              </p>
            )}
          </Card>

          {/* Filters */}
          <Card className="p-4 space-y-4 border-[#033f63]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#033f63]" />
                <h4 className="text-sm font-medium text-[#033f63]">Filtros</h4>
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs text-[#b5b682] hover:text-[#033f63] hover:bg-[#033f63]/10"
                >
                  <X size={14} className="mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Tipo Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Tipo de Gasto</Label>
                <Select
                  value={filterType}
                  onValueChange={(value: "all" | "supplies" | "delivery") =>
                    setFilterType(value)
                  }
                >
                  <SelectTrigger className="h-9 text-sm border-[#033f63]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="supplies">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-[#033f63]" />
                        <span>Insumos</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="delivery">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-[#28666e]" />
                        <span>Cadetería</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filters */}
              <div className="space-y-2">
                <Label htmlFor="expStartDate" className="text-xs text-gray-600">
                  Desde
                </Label>
                <Input
                  id="expStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm border-[#033f63]/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expEndDate" className="text-xs text-gray-600">
                  Hasta
                </Label>
                <Input
                  id="expEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm border-[#033f63]/20"
                />
              </div>
            </div>
          </Card>

          {/* Expenses Table */}
          <Card className="p-4">
            <h3 className="text-[#033f63] mb-3 font-medium">Detalle de Gastos</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin h-6 w-6 text-[#033f63]" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                {hasActiveFilters
                  ? "No hay gastos que coincidan con los filtros"
                  : "No hay gastos registrados"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#033f63]">
                      <th className="text-left py-2 px-2 text-[#033f63]">Fecha</th>
                      <th className="text-left py-2 px-2 text-[#033f63]">Tipo</th>
                      <th className="text-left py-2 px-2 text-[#033f63]">Descripción</th>
                      <th className="text-right py-2 px-2 text-[#033f63]">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense, index) => (
                      <tr
                        key={expense.id}
                        className={`border-b border-gray-100 ${
                          index % 2 === 0 ? "bg-gray-50" : ""
                        }`}
                      >
                        <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                          {formatDate(expense.fecha)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {getExpenseIcon(expense.tipo)}
                            <span className="text-gray-700">
                              {getExpenseTypeText(expense.tipo)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-700">{expense.descripcion}</td>
                        <td className="py-3 px-2 text-right text-[#033f63] font-medium">
                          ${expense.monto.toLocaleString("es-ES")}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#033f63] bg-[#033f63]/5">
                      <td colSpan={3} className="py-3 px-2 text-right text-[#033f63]">
                        <strong>TOTAL:</strong>
                      </td>
                      <td className="py-3 px-2 text-right text-[#033f63]">
                        <strong>${totalExpenses.toLocaleString("es-ES")}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#033f63] hover:bg-[#28666e]"
          >
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
