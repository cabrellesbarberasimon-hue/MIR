"use client";
import { usePathname } from "next/navigation";

/** Contenedor de la página: columna estrecha en el móvil; en PC deja sitio al menú lateral y usa más ancho. */
export function Marco({ children }: { children: React.ReactNode }) {
  const conMenu = usePathname() !== "/login";
  return (
    <main className={`mx-auto max-w-xl px-4 pb-28 pt-4 ${conMenu ? "lg:ml-56 lg:max-w-none lg:px-10 lg:pb-10 lg:pt-8" : ""}`}>
      <div className="lg:mx-auto lg:max-w-5xl">{children}</div>
    </main>
  );
}
