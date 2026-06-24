import { AnswerleyTryClient } from "@/components/onboarding/answerley-try-client";

export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const businessValue = params.business;
  const previewValue = params.preview;
  const businessInput = Array.isArray(businessValue)
    ? businessValue[0]
    : businessValue ?? "example.com";
  const preview = Array.isArray(previewValue)
    ? previewValue[0] ?? null
    : previewValue ?? null;

  return <AnswerleyTryClient businessInput={businessInput} preview={preview} />;
}
