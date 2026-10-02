"use client";
import { accBorrarBloque } from "@/app/acciones";

export function BorrarBloque({ id }: { id: number }) {
  return (
    <button aria-label="Borrar bloque" className="px-2 text-suave"
      onClick={() => { if (confirm("¿Borrar este bloque y sus errores?")) accBorrarBloque(id); }}>✕</button>
  );
}
