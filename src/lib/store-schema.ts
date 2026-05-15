import { z } from "zod";

export const storeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(80, "O nome deve ter no maximo 80 caracteres."),
  location: z
    .string()
    .trim()
    .max(120, "A localizacao deve ter no maximo 120 caracteres.")
    .optional()
    .transform((value) => (value ? value : null)),
});

export type StoreFormData = z.infer<typeof storeSchema>;
export type StoreFormInput = z.input<typeof storeSchema>;
