import { redirect } from "next/navigation";

export default function LegacyAppStoresRedirect() {
  redirect("/app/stores");
}
