import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Answerley Foundation",
    template: "%s | Answerley Foundation",
  },
  description:
    "A visual-first foundation for a configurable AI answering service.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
