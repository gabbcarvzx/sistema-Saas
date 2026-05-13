import { z } from "zod";

export const loginSchema = z.object({
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Informe o cliente."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um email valido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
