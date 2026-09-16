import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resolve Tech | Assistência técnica",
  description: "Assistência técnica com diagnóstico claro, atendimento cuidadoso e garantia no serviço.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
