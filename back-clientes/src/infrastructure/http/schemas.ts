import { z } from "zod";

/** Validación de forma del body; las reglas de negocio (formato email, documento) viven en el dominio. */
export const clienteBodySchema = z.object({
  nombre: z.string({ error: "nombre es obligatorio" }).trim().min(1, "nombre es obligatorio"),
  email: z.string({ error: "email es obligatorio" }).trim().min(1, "email es obligatorio"),
  documento: z.string({ error: "documento es obligatorio" }).trim().min(1, "documento es obligatorio"),
  telefono: z.string().trim().nullish(),
});

export type ClienteBody = z.infer<typeof clienteBodySchema>;
