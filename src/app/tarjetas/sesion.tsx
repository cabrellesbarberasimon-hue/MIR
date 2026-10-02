"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { accExplicarFallo, accMarcarMal, accResponder, accSiguienteTarjeta } from "@/app/acciones";
import { MOTIVOS, textoMotivo } from "@/lib/etiquetas";
import type { MotivoError } from "@/db/schema";

type Tarjeta = NonNullable<Awaited<ReturnType<typeof accSiguienteTarjeta>>>;

export function Sesion({ inicial, preguntarMotivo, limite }: { inicial: Tarjeta | null; preguntarMotivo: boolean; limite?: number }) {
  const [t, setT] = useState<Tarjeta | null>(inicial);
  const [fase, setFase] = useState<"pregunta" | "respuesta" | "motivo">("pregunta");
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [fuente, setFuente] = useState(false);
  const [vistas, setVistas] = useState<number[]>([]);
  const [hechas, setHechas] = useState(0);
  const [pendiente, empezar] = useTransition();

  const terminado = !t || (limite != null && hechas >= limite);

  const siguiente = useCallback(async (vistasAhora: number[]) => {
    const n = await accSiguienteTarjeta(limite != null ? vistasAhora : []);
    setT(n); setFase("pregunta"); setNota(""); setFuente(false); setHistorialId(null);
  }, [limite]);

  const responder = useCallback((r: "sabia" | "dudosa" | "fallada") => {
    if (!t) return;
    empezar(async () => {
      const hId = await accResponder(t.id, r);
      const v = [...vistas, t.id];
      setVistas(v); setHechas((h) => h + 1);
      if (r === "fallada" && preguntarMotivo) { setHistorialId(hId); setFase("motivo"); return; }
      await siguiente(v);
    });
  }, [t, vistas, preguntarMotivo, siguiente]);

  const explicar = (m: MotivoError | null) => empezar(async () => {
    if (historialId && (m || nota.trim())) await accExplicarFallo(historialId, m, nota);
    await siguiente(vistas);
  });

  const marcarMal = () => {
    if (!t) return;
    const c = prompt("¿Qué está mal? (opcional)");
    if (c === null) return;
    empezar(async () => { await accMarcarMal(t.id, c); const v = [...vistas, t.id]; setVistas(v); await siguiente(v); });
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || pendiente) return;
      if (fase === "pregunta" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setFase("respuesta"); }
      else if (fase === "respuesta" && ["1", "2", "3"].includes(e.key)) responder((["fallada", "dudosa", "sabia"] as const)[Number(e.key) - 1]);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [fase, pendiente, responder]);

  if (terminado) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="text-xl font-semibold">{hechas ? `Hecho: ${hechas} tarjeta${hechas === 1 ? "" : "s"}` : "No quedan tarjetas para hoy"}</h1>
        <p className="sub">Las nuevas solo entran de temas realizados o planificados hasta hoy.</p>
        <Link href="/" className="btn-primario">Volver a Hoy</Link>
      </div>
    );
  }

  return (
    <div className={`flex min-h-[70vh] flex-col gap-3 ${pendiente ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between text-xs text-suave">
        <span className="truncate">{t.asignatura} · {t.tema}</span>
        <span>{limite != null ? `${hechas}/${limite}` : `${t.cupo.restantes} restantes`}{t.state === 0 ? " · nueva" : ""}</span>
      </div>

      <button className="caja min-h-40 text-left text-lg leading-snug" onClick={() => fase === "pregunta" && setFase("respuesta")}>
        {t.concepto && <span className="sub mb-1 block">{t.concepto}</span>}
        {t.pregunta}
      </button>

      {fase === "pregunta" ? (
        <button className="btn-primario mt-auto min-h-14 w-full text-lg" onClick={() => setFase("respuesta")}>Mostrar respuesta</button>
      ) : (
        <>
          <div className="caja border-acento text-lg leading-snug">{t.respuesta}</div>
          {t.notas.length > 0 && (
            <div className="rounded-lg bg-mal/10 p-3 text-sm">
              <p className="sub mb-1">Tus fallos anteriores</p>
              {t.notas.map((n, i) => <p key={i}>• {textoMotivo(n.motivo)}{n.nota ? ` — ${n.nota}` : ""}</p>)}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <button className="sub underline" onClick={() => setFuente(!fuente)}>Fuente{t.pagina ? ` · pág. ${t.pagina}` : ""}</button>
            {t.refsMir.length > 0 && <span className="sub">MIR {[...new Set(t.refsMir)].sort().join(", ")}</span>}
            <button className="sub ml-auto underline" onClick={marcarMal}>Esta tarjeta está mal</button>
          </div>
          {fuente && <blockquote className="border-l-2 border-borde pl-3 text-sm text-suave">{t.fragmento}</blockquote>}

          {fase === "respuesta" ? (
            <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
              <button disabled={pendiente} onClick={() => responder("fallada")} className="btn min-h-14 bg-mal text-white">Fallada</button>
              <button disabled={pendiente} onClick={() => responder("dudosa")} className="btn min-h-14 bg-duda text-white">Dudosa</button>
              <button disabled={pendiente} onClick={() => responder("sabia")} className="btn min-h-14 bg-bien text-white">La sabía</button>
            </div>
          ) : (
            <div className="caja mt-auto flex flex-col gap-2">
              <p className="sub">¿Por qué la fallaste? (opcional)</p>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS.map((m) => <button key={m.valor} disabled={pendiente} className="chip" onClick={() => explicar(m.valor)}>{m.texto}</button>)}
              </div>
              <input className="campo" placeholder="Explicación (opcional) y elige motivo o pulsa Saltar" value={nota} onChange={(e) => setNota(e.target.value)} />
              <button disabled={pendiente} className="btn-sec" onClick={() => explicar(null)}>{nota.trim() ? "Guardar sin motivo" : "Saltar"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
