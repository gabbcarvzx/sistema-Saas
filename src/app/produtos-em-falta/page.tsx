import { redirect } from "next/navigation";

export default function LegacyMissingProductsRedirect() {
  redirect("/app/produtos-em-falta");
}
