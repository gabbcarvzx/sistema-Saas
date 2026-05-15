import { redirect } from "next/navigation";

export default function LegacyStoresRedirect() {
  redirect("/app/stores");
}
