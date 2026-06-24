import type { Metadata } from "next";
import { AnsweringPlanLabClient } from "@/components/plan/answering-plan-lab-client";

export const metadata: Metadata = {
  title: "Answering Plan Lab",
};

export default function AnsweringPlanLabPage() {
  return <AnsweringPlanLabClient />;
}
