"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", texto: "Hoy", icono: "◉" },
  { href: "/calendario", texto: "Plan", icono: "▦" },
  { href: "/registrar", texto: "Registrar", icono: "＋" },
  { href: "/tarjetas", texto: "Tarjetas", icono: "▭" },
  { href: "/mas", texto: "Más", icono: "≡" },
];

export function Navegacion() {
  const ruta = usePathname();
  if (ruta === "/login") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl">
        {ENLACES.map((e) => {
          const activo = e.href === "/" ? ruta === "/" : ruta.startsWith(e.href);
          return (
            <li key={e.href} className="flex-1">
              <Link href={e.href} className={`flex flex-col items-center py-2 text-xs ${activo ? "text-acento" : "text-suave"}`}>
                <span className="text-lg leading-6">{e.icono}</span>
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
