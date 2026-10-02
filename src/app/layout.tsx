import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navegacion } from "@/components/navegacion";

export const metadata: Metadata = { title: "MIR", description: "Planificación, errores y repasos MIR" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f6f5e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto max-w-xl px-4 pb-28 pt-4">{children}</main>
        <Navegacion />
      </body>
    </html>
  );
}
