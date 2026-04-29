import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import orderService from "../../services/order.service";
import productoService from "../../services/producto.service";
import estadoService from "../../services/estado.service";
import { Trash2 } from "lucide-react";
import type { IEstado, IOrderWithCalculations, IProducto } from "../types";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IOrderWithCalculations | null;
  onOrderUpdated?: () => void;
}

const toDateInputValue = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type DetailFormState = {
  id: number;
  isNew?: boolean;
  id_producto: string;
  cantidad: string;
  precio_unitario: string;
  paciente: string;
  id_estado: string;
};

export function EditOrderDialog({
  open,
  onOpenChange,
  order,
  onOrderUpdated,
}: EditOrderDialogProps) {
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [detailForms, setDetailForms] = useState<DetailFormState[]>([]);
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [estados, setEstados] = useState<IEstado[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingDetail, setIsDeletingDetail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailPendingDelete, setDetailPendingDelete] = useState<DetailFormState | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadCatalogs = async () => {
      try {
        setIsLoadingCatalogs(true);
        const [productosData, estadosData] = await Promise.all([
          productoService.getAll(),
          estadoService.getAll(),
        ]);
        setProductos(productosData);
        setEstados(estadosData);
      } catch (err) {
        console.error("Error loading order catalogs:", err);
        toast.error("No se pudieron cargar productos y estados");
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    loadCatalogs();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDueDate(toDateInputValue(order?.fecha_entrega));
    setDescription(String(order?.descripcion ?? ""));
    setDetailForms(
      (order?.detalles || []).map((detalle) => ({
        id: Number(detalle.id),
        isNew: false,
        id_producto: String(detalle.id_producto ?? ""),
        cantidad: String(detalle.cantidad ?? "1"),
        precio_unitario: String(detalle.precio_unitario ?? ""),
        paciente: String(detalle.paciente ?? ""),
        id_estado: String(detalle.id_estado ?? ""),
      }))
    );
    setErrors({});
  }, [open, order]);

  const updateDetailField = (detailId: number, field: keyof DetailFormState, value: string) => {
    setDetailForms((prev) => prev.map((detail) => (
      detail.id === detailId ? { ...detail, [field]: value } : detail
    )));
  };

  const handleRequestDeleteDetail = (detail: DetailFormState) => {
    setDetailPendingDelete(detail);
  };

  const confirmDeleteDetail = async () => {
    if (!order || !detailPendingDelete) return;

    if (detailPendingDelete.isNew) {
      setDetailForms((prev) => prev.filter((detail) => detail.id !== detailPendingDelete.id));
      setDetailPendingDelete(null);
      return;
    }

    setIsDeletingDetail(true);
    try {
      const result = await orderService.deleteDetalle(order.id, detailPendingDelete.id);

      setDetailForms((prev) => prev.filter((detail) => detail.id !== detailPendingDelete.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`producto-${detailPendingDelete.id}`];
        delete next[`cantidad-${detailPendingDelete.id}`];
        delete next[`precio-${detailPendingDelete.id}`];
        delete next[`estado-${detailPendingDelete.id}`];
        return next;
      });
      toast.success(result.message || "Detalle eliminado permanentemente. Los montos del pedido ya reflejan el cambio.");
      setDetailPendingDelete(null);
      onOrderUpdated?.();
    } catch (err: any) {
      console.error("Error deleting detail:", err);
      toast.error(err?.response?.data?.error || "No se pudo eliminar el detalle del pedido");
    } finally {
      setIsDeletingDetail(false);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!dueDate) {
      nextErrors.dueDate = "La fecha de entrega es requerida";
    }

    detailForms.forEach((detail) => {
      if (!detail.id_producto) nextErrors[`producto-${detail.id}`] = "Seleccioná un producto";
      if (!detail.id_estado) nextErrors[`estado-${detail.id}`] = "Seleccioná un estado";

      const cantidad = Number(detail.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        nextErrors[`cantidad-${detail.id}`] = "Cantidad inválida";
      }

      const precio = Number(detail.precio_unitario);
      if (!Number.isFinite(precio) || precio <= 0) {
        nextErrors[`precio-${detail.id}`] = "Precio inválido";
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!validate()) {
      return;
    }

    const parsed = new Date(`${dueDate}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      setErrors((prev) => ({ ...prev, dueDate: "Fecha de entrega inválida" }));
      return;
    }

    setIsSubmitting(true);
    try {
      const detailById = new Map((order.detalles || []).map((detail) => [Number(detail.id), detail]));

      await orderService.update(order.id, {
        fecha_entrega: dueDate,
        descripcion: description.trim() || "",
      });

      for (const detailForm of detailForms) {
        if (detailForm.isNew) {
          await orderService.addDetalle(order.id, {
            id_producto: Number(detailForm.id_producto),
            cantidad: Number(detailForm.cantidad),
            precio_unitario: Number(detailForm.precio_unitario),
            paciente: String(detailForm.paciente ?? "").trim() || "-",
            id_estado: Number(detailForm.id_estado),
          });
          continue;
        }

        const original = detailById.get(detailForm.id);
        if (!original) continue;

        const nextPayload = {
          id_producto: Number(detailForm.id_producto),
          cantidad: Number(detailForm.cantidad),
          precio_unitario: Number(detailForm.precio_unitario),
          paciente: String(detailForm.paciente ?? "").trim() || "-",
          id_estado: Number(detailForm.id_estado),
        };

        const changed =
          Number(original.id_producto) !== nextPayload.id_producto ||
          Number(original.cantidad) !== nextPayload.cantidad ||
          Number(original.precio_unitario) !== nextPayload.precio_unitario ||
          String(original.paciente ?? "") !== nextPayload.paciente ||
          Number(original.id_estado) !== nextPayload.id_estado;

        if (!changed) continue;

        await orderService.updateDetalle(order.id, detailForm.id, nextPayload);
      }

      toast.success("Pedido actualizado. Los saldos y montos relacionados ya reflejan los cambios.");
      onOpenChange(false);
      onOrderUpdated?.();
    } catch (err: any) {
      console.error("Error updating order:", err);
      toast.error(err?.response?.data?.error || "No se pudo actualizar el pedido ni recalcular sus montos relacionados");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar los datos generales y detalles del pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editOrderDueDate">Fecha de Entrega</Label>
            <Input
              id="editOrderDueDate"
              name="editOrderDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setErrors((prev) => ({ ...prev, dueDate: "" }));
              }}
              className={errors.dueDate ? "border-red-500" : ""}
            />
            {errors.dueDate && <p className="text-sm text-red-500 mt-1">{errors.dueDate}</p>}
          </div>

          <div>
            <Label htmlFor="editOrderDescription">Descripción</Label>
            <Textarea
              id="editOrderDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descripción del pedido"
            />
          </div>

          <div className="space-y-3">
            {detailForms.map((detail, index) => (
              <div key={detail.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">
                    {detail.isNew ? `Nuevo detalle ${index + 1}` : `Detalle ${index + 1}`}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRequestDeleteDetail(detail)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isSubmitting || isDeletingDetail}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Eliminar detalle
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`detail-product-${detail.id}`}>Producto</Label>
                  <Select
                    value={detail.id_producto}
                    onValueChange={(value) => updateDetailField(detail.id, "id_producto", value)}
                    disabled={isLoadingCatalogs}
                  >
                    <SelectTrigger id={`detail-product-${detail.id}`} className={errors[`producto-${detail.id}`] ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((producto) => (
                        <SelectItem key={producto.id} value={String(producto.id)}>
                          {producto.tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[`producto-${detail.id}`] && <p className="text-sm text-red-500 mt-1">{errors[`producto-${detail.id}`]}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`detail-qty-${detail.id}`}>Cantidad</Label>
                    <Input
                      id={`detail-qty-${detail.id}`}
                      type="number"
                      min="1"
                      value={detail.cantidad}
                      onChange={(e) => updateDetailField(detail.id, "cantidad", e.target.value)}
                      className={errors[`cantidad-${detail.id}`] ? "border-red-500" : ""}
                    />
                    {errors[`cantidad-${detail.id}`] && <p className="text-sm text-red-500 mt-1">{errors[`cantidad-${detail.id}`]}</p>}
                  </div>

                  <div>
                    <Label htmlFor={`detail-price-${detail.id}`}>Precio Unitario</Label>
                    <Input
                      id={`detail-price-${detail.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={detail.precio_unitario}
                      onChange={(e) => updateDetailField(detail.id, "precio_unitario", e.target.value)}
                      className={errors[`precio-${detail.id}`] ? "border-red-500" : ""}
                    />
                    {errors[`precio-${detail.id}`] && <p className="text-sm text-red-500 mt-1">{errors[`precio-${detail.id}`]}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor={`detail-patient-${detail.id}`}>Paciente</Label>
                  <Input
                    id={`detail-patient-${detail.id}`}
                    type="text"
                    value={detail.paciente}
                    onChange={(e) => updateDetailField(detail.id, "paciente", e.target.value)}
                    placeholder="Nombre del paciente"
                  />
                </div>

                <div>
                  <Label htmlFor={`detail-status-${detail.id}`}>Estado</Label>
                  <Select
                    value={detail.id_estado}
                    onValueChange={(value) => updateDetailField(detail.id, "id_estado", value)}
                    disabled={isLoadingCatalogs}
                  >
                    <SelectTrigger id={`detail-status-${detail.id}`} className={errors[`estado-${detail.id}`] ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((estado) => (
                        <SelectItem key={estado.id} value={String(estado.id)}>
                          {estado.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[`estado-${detail.id}`] && <p className="text-sm text-red-500 mt-1">{errors[`estado-${detail.id}`]}</p>}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>

        <AlertDialog open={!!detailPendingDelete} onOpenChange={(open) => !open && !isDeletingDetail ? setDetailPendingDelete(null) : undefined}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Detalle Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                {detailPendingDelete
                  ? detailPendingDelete.isNew
                    ? `Este nuevo detalle se quitará del formulario antes de guardar.`
                    : `El detalle ${detailForms.findIndex((detail) => detail.id === detailPendingDelete.id) + 1} se eliminará definitivamente del pedido. El pedido se mantendrá activo aunque quede sin detalles, y no se modificarán los pagos ya registrados. Esta acción no se puede deshacer.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingDetail}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDeleteDetail();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {detailPendingDelete?.isNew
                  ? "Quitar Detalle"
                  : isDeletingDetail
                    ? "Eliminando..."
                    : "Eliminar Permanentemente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}