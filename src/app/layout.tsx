import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EXPLO CONTROL", template: "%s · EXPLO CONTROL" },
  description: "Gestão de estoques e rastreabilidade de materiais controlados",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d2c3d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
