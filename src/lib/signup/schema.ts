import { z } from "zod";

export const signupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa."),
  tenantSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Informe um slug com pelo menos 3 caracteres.")
    .max(48, "O slug deve ter no maximo 48 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minusculas, numeros e hifens.",
    ),
  adminName: z
    .string()
    .trim()
    .min(2, "Informe o nome do administrador."),
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um email valido."),
  password: z
    .string()
    .min(10, "A senha deve ter pelo menos 10 caracteres.")
    .regex(/[A-Z]/, "A senha deve ter pelo menos uma letra maiuscula.")
    .regex(/[a-z]/, "A senha deve ter pelo menos uma letra minuscula.")
    .regex(/[0-9]/, "A senha deve ter pelo menos um numero."),
  logoUrl: z.string().trim().url().optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor hexadecimal valida.")
    .default("#22d3ee"),
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um email de suporte valido.")
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
