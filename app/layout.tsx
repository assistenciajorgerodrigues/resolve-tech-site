import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assistência Técnica Jorge Rodrigues",
  description: "Assistência Técnica Jorge Rodrigues — atendimento técnico com diagnóstico claro, visita agendada e garantia no serviço.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
