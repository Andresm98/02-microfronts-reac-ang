import { z } from "zod";

export const lineaSchema = z.object({
  producto: z.string({ error: "producto es obligatorio" }).trim().min(1, "producto es obligatorio"),
  cantidad: z
    .number({ error: "cantidad debe ser un número" })
    .int("cantidad debe ser un entero")
    .positive("cantidad debe ser mayor que 0"),
  precioUnitario: z
    .number({ error: "precioUnitario debe ser un número" })
    .nonnegative("precioUnitario no puede ser negativo"),
});

export const registrarVentaSchema = z.object({
  clienteId: z.string({ error: "clienteId es obligatorio" }).trim().min(1, "clienteId es obligatorio"),
  lineas: z.array(lineaSchema, { error: "lineas debe ser un array" }).min(1, "La venta debe tener al menos una línea"),
});

export const listarQuerySchema = z.object({
  clienteId: z.string().trim().optional(),
});
