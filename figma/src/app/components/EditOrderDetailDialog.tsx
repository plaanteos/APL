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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import productoService from "../../services/producto.service";
import estadoService from "../../services/estado.service";
import orderService from "../../services/order.service";
import type { IDetallePedido, IEstado, IOrderWithCalculations, IProducto } from "../types";

interface EditOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IOrderWithCalculations | null;
  detalle: IDetallePedido | null;
  onUpdated?: () => void;
}

export function EditOrderDetailDialog({
  open,
  onOpenChange,
  order,
  detalle,
  onUpdated,
}: EditOrderDetailDialogProps) {
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [estados, setEstados] = useState<IEstado[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    id_producto: "",
    cantidad: "1",
    precio_unitario: "",
    paciente: "",
    id_estado: "",
  });

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
        console.error("Error loading catalogs for detail edition:", err);
        toast.error("No se pudieron cargar productos/estados");
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    loadCatalogs();
  }, [open]);

  useEffect(() => {
    if (!open || !detalle) return;
    setFormData({
      id_producto: String(detalle.id_producto ?? ""),
      cantidad: String(detalle.cantidad ?? 1),
      precio_unitario: String(detalle.precio_unitario ?? ""),
      paciente: String(detalle.paciente ?? ""),
      id_estado: String(detalle.id_estado ?? ""),
    });
    setErrors({});
  }, [open, detalle]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const cantidad = Number(formData.cantidad);
    const precio = Number(formData.precio_unitario);

    if (!formData.id_producto) nextErrors.id_producto = "Seleccioná un producto";
    if (!Number.isFinite(cantidad) || cantidad <= 0) nextErrors.cantidad = "Cantidad inválida";
    if (!Number.isFinite(precio) || precio <= 0) nextErrors.precio_unitario = "Precio inválido";
    if (!formData.id_estado) nextErrors.id_estado = "Seleccioná un estado";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !detalle) return;

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await orderService.updateDetalle(order.id, detalle.id, {
        id_producto: Number(formData.id_producto),
        cantidad: Number(formData.cantidad),
        precio_unitario: Number(formData.precio_unitario),
        paciente: String(formData.paciente ?? "").trim() || "-",
        id_estado: Number(formData.id_estado),
      });
      toast.success("Detalle actualizado");
      onOpenChange(false);
      onUpdated?.();
    } catch (err: any) {
      console.error("Error updating order detail:", err);
      toast.error(err?.response?.data?.error || "No se pudo actualizar el detalle");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Detalle</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar un detalle de pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editDetalleProducto">Producto</Label>
            <Select
              value={formData.id_producto}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, id_producto: value }))}
              disabled={isLoadingCatalogs || productos.length === 0}
            >
              <SelectTrigger id="editDetalleProducto" className={errors.id_producto ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_producto && <p className="text-sm text-red-500 mt-1">{errors.id_producto}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="editDetalleCantidad">Cantidad</Label>
              <Input
                id="editDetalleCantidad"
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) => setFormData((prev) => ({ ...prev, cantidad: e.target.value }))}
                className={errors.cantidad ? "border-red-500" : ""}
              />
              {errors.cantidad && <p className="text-sm text-red-500 mt-1">{errors.cantidad}</p>}
            </div>

            <div>
              <Label htmlFor="editDetallePrecio">Precio Unitario</Label>
              <Input
                id="editDetallePrecio"
                type="number"
                min="0"
                step="0.01"
                value={formData.precio_unitario}
                onChange={(e) => setFormData((prev) => ({ ...prev, precio_unitario: e.target.value }))}
                className={errors.precio_unitario ? "border-red-500" : ""}
              />
              {errors.precio_unitario && <p className="text-sm text-red-500 mt-1">{errors.precio_unitario}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="editDetallePaciente">Paciente</Label>
            <Input
              id="editDetallePaciente"
              type="text"
              value={formData.paciente}
              onChange={(e) => setFormData((prev) => ({ ...prev, paciente: e.target.value }))}
              placeholder="Nombre del paciente"
            />
          </div>

          <div>
            <Label htmlFor="editDetalleEstado">Estado</Label>
            <Select
              value={formData.id_estado}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, id_estado: value }))}
              disabled={isLoadingCatalogs || estados.length === 0}
            >
              <SelectTrigger id="editDetalleEstado" className={errors.id_estado ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_estado && <p className="text-sm text-red-500 mt-1">{errors.id_estado}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}