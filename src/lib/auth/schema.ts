import { z } from "zod";

export const loginSchema = z.object({
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Informe o cliente.")
    .max(48, "O cliente deve ter no maximo 48 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minusculas, numeros e hifens.",
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um email valido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
