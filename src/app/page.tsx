import { ProductsClient } from "@/app/components/products-client";
import { getTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await getTenantContext();

  return <ProductsClient />;
}
