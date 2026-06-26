import { redirect } from "next/navigation";

export default function LegacyTestCallPage() {
  redirect("/dashboard/calls/test-call");
}
