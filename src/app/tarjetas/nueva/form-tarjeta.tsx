"use client";
import { useState } from "react";
import { accCrearTarjeta } from "@/app/acciones";
import { SelectorTema, type AsignaturaConTemas } from "@/components/selector-tema";

export function FormTarjeta({ temario, temaInicial, concepto, respuesta }: { temario: AsignaturaConTemas[]; temaInicial?: number; concepto?: string; respuesta?: string }) {
  const [tema, setTema] = useState<number[]>(temaInicial ? [temaInicial] : []);
  return (
    <form action={accCrearTarjeta} className="flex flex-col gap-3">
      <div className="caja"><SelectorTema temario={temario} valor={tema} onCambio={setTema} /></div>
      <input type="hidden" name="temaId" value={tema[0] ?? ""} />
      <input name="concepto" defaultValue={concepto} placeholder="Concepto (opcional)" className="campo" />
      <textarea name="pregunta" required placeholder="Pregunta (que se entienda sola)" className="campo min-h-20 py-2" />
      <textarea name="respuesta" required defaultValue={respuesta} placeholder="Respuesta (corta)" className="campo min-h-16 py-2" />
      <button className="btn-primario" disabled={!tema.length}>Crear tarjeta</button>
    </form>
  );
}
