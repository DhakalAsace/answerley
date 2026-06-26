import type { Metadata } from "next";
import "./globals.css";
import { product } from "@/lib/product";

export const metadata: Metadata = {
  title: {
    default: product.name,
    template: `%s | ${product.name}`,
  },
  description: product.promise,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
