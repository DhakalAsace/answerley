import { redirect } from "next/navigation";

export default async function LegacyAppSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  redirect(`/dashboard/${section}`);
}
