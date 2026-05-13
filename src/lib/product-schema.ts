import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres."),
  code: z
    .string()
    .trim()
    .min(2, "Informe um codigo com pelo menos 2 caracteres.")
    .max(40, "O codigo deve ter no maximo 40 caracteres."),
  price: z.coerce
    .number({ message: "Informe um preco valido." })
    .positive("O preco deve ser maior que zero."),
  quantity: z.coerce
    .number({ message: "Informe uma quantidade valida." })
    .int("A quantidade deve ser um numero inteiro.")
    .min(0, "A quantidade nao pode ser negativa."),
  minStock: z.coerce
    .number({ message: "Informe um estoque minimo valido." })
    .int("O estoque minimo deve ser um numero inteiro.")
    .min(0, "O estoque minimo nao pode ser negativo."),
  category: z
    .string()
    .trim()
    .min(2, "Informe uma categoria com pelo menos 2 caracteres."),
  storeId: z.string().uuid("Selecione uma loja valida."),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;
