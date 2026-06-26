import { redirect } from "next/navigation";

export default function LegacyCallsPage() {
  redirect("/dashboard/calls");
}
