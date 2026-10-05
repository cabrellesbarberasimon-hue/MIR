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

/** En pantallas grandes (PC) la barra inferior se sustituye por un menú lateral con todas las secciones. */
const LATERAL = [
  ...ENLACES.slice(0, 4),
  { href: "/repasos", texto: "Repasos", icono: "↻" },
  { href: "/temario", texto: "Temario", icono: "☰" },
  { href: "/progreso", texto: "Progreso", icono: "▲" },
  { href: "/diez-minutos", texto: "10 minutos", icono: "⏱" },
  { href: "/temporizador", texto: "Temporizador", icono: "◷" },
  { href: "/buscar", texto: "Buscar", icono: "⌕" },
  { href: "/mas", texto: "Más", icono: "≡" },
];

const esActivo = (ruta: string, href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));

export function Navegacion() {
  const ruta = usePathname();
  if (ruta === "/login") return null;
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl">
          {ENLACES.map((e) => (
            <li key={e.href} className="flex-1">
              <Link href={e.href} className={`flex flex-col items-center py-2 text-xs ${esActivo(ruta, e.href) ? "text-acento" : "text-suave"}`}>
                <span className="text-lg leading-6">{e.icono}</span>
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="fixed inset-y-0 left-0 z-10 hidden w-56 flex-col border-r border-borde bg-superficie p-3 lg:flex">
        <p className="px-3 pb-4 pt-2 text-lg font-semibold text-acento">MIR</p>
        <ul className="flex flex-col gap-0.5">
          {LATERAL.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 ${esActivo(ruta, e.href) ? "bg-acento/10 font-medium text-acento" : "text-texto hover:bg-borde/50"}`}>
                <span className="w-5 text-center">{e.icono}</span>
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
