import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnsweringPlanLabClient } from "@/components/plan/answering-plan-lab-client";

export const metadata: Metadata = {
  title: "Answering Plan Lab",
};

export default function AnsweringPlanLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AnsweringPlanLabClient />;
}
