"use client";
import { useState, useTransition } from "react";
import { accRegistrar } from "@/app/acciones";
import { SelectorTema, type AsignaturaConTemas } from "@/components/selector-tema";
import { MOTIVOS } from "@/lib/etiquetas";
import type { MotivoError } from "@/db/schema";

type Fila = { motivo: MotivoError | null; concepto: string; nota: string; abierta: boolean };
const filaVacia = (): Fila => ({ motivo: null, concepto: "", nota: "", abierta: false });

function Numero({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="sub">{etiqueta}</span>
      <input inputMode="numeric" pattern="[0-9]*" className="campo text-center text-lg" value={valor}
        onChange={(e) => onCambio(e.target.value.replace(/\D/g, ""))} />
    </label>
  );
}

/**
 * Registro rápido: tema → nº de preguntas y aciertos → (opcional) motivo de cada fallo.
 * "Aplicar a todos" asigna el mismo motivo a todos los fallos de una vez (registro en bloque).
 * Sin nº de preguntas se registran solo errores sueltos.
 */
export function FormRegistro({ temario, temaInicial }: { temario: AsignaturaConTemas[]; temaInicial?: number }) {
  const [tema, setTema] = useState<number[]>(temaInicial ? [temaInicial] : []);
  const [total, setTotal] = useState("");
  const [aciertos, setAciertos] = useState("");
  const [blancos, setBlancos] = useState("");
  const [sueltos, setSueltos] = useState(1);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const t = Number(total) || 0;
  const conBloque = t > 0;
  const fallos = conBloque ? Math.max(0, t - (Number(aciertos) || 0) - (Number(blancos) || 0)) : sueltos;
  const lista = Array.from({ length: Math.min(fallos, 200) }, (_, i) => filas[i] ?? filaVacia());

  const cambiar = (i: number, cambios: Partial<Fila>) => {
    const n = [...lista];
    n[i] = { ...n[i], ...cambios };
    setFilas(n);
  };
  const todos = (m: MotivoError) => setFilas(lista.map((f) => ({ ...f, motivo: m })));

  const guardar = () => empezar(async () => {
    const r = await accRegistrar({
      temaId: tema[0],
      total: conBloque ? t : undefined,
      aciertos: conBloque ? Number(aciertos) || 0 : undefined,
      blancos: conBloque ? Number(blancos) || 0 : undefined,
      errores: lista.map((f) => ({ motivo: f.motivo, concepto: f.concepto || undefined, nota: f.nota || undefined })),
    });
    setOk(`Guardado: ${r.errores} error${r.errores === 1 ? "" : "es"}${r.bloqueId ? " y el bloque de preguntas" : ""}.`);
    setTotal(""); setAciertos(""); setBlancos(""); setFilas([]); setSueltos(1);
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="caja flex flex-col gap-3">
        <SelectorTema temario={temario} valor={tema} onCambio={(v) => { setTema(v); setOk(null); }} />
      </section>

      {tema.length > 0 && (
        <>
          <section className="caja flex flex-col gap-3">
            <div className="flex gap-2">
              <Numero etiqueta="Preguntas" valor={total} onCambio={setTotal} />
              <Numero etiqueta="Aciertos" valor={aciertos} onCambio={setAciertos} />
              <Numero etiqueta="En blanco" valor={blancos} onCambio={setBlancos} />
            </div>
            {conBloque ? (
              <p className="sub">{fallos} fallo{fallos === 1 ? "" : "s"}. El motivo es opcional.</p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="sub flex-1">Sin bloque: registrar errores sueltos</span>
                <button className="btn-sec px-3" onClick={() => setSueltos(Math.max(1, sueltos - 1))}>−</button>
                <span className="w-6 text-center">{sueltos}</span>
                <button className="btn-sec px-3" onClick={() => setSueltos(sueltos + 1)}>＋</button>
              </div>
            )}
          </section>

          {fallos > 0 && (
            <section className="caja flex flex-col gap-3">
              {fallos > 1 && (
                <div>
                  <p className="sub mb-1">Aplicar a todos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOTIVOS.map((m) => <button key={m.valor} className="chip" onClick={() => todos(m.valor)}>{m.texto}</button>)}
                  </div>
                </div>
              )}
              <ol className="flex flex-col divide-y divide-borde">
                {lista.map((f, i) => (
                  <li key={i} className="flex flex-col gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="sub w-6">{i + 1}</span>
                      <div className="-mr-4 flex flex-1 gap-1.5 overflow-x-auto pr-4 [scrollbar-width:none]">
                        {MOTIVOS.map((m) => (
                          <button key={m.valor} onClick={() => cambiar(i, { motivo: f.motivo === m.valor ? null : m.valor })}
                            className={`chip shrink-0 ${f.motivo === m.valor ? "chip-on" : ""}`}>{m.texto}</button>
                        ))}
                      </div>
                    </div>
                    {f.abierta ? (
                      <div className="ml-8 flex flex-col gap-2">
                        <input className="campo" placeholder="Concepto (p. ej. criterios de Light)" value={f.concepto}
                          onChange={(e) => cambiar(i, { concepto: e.target.value })} />
                        <textarea className="campo min-h-16 py-2" placeholder="Nota: qué debo recordar" value={f.nota}
                          onChange={(e) => cambiar(i, { nota: e.target.value })} />
                      </div>
                    ) : (
                      <button className="sub ml-8 self-start underline" onClick={() => cambiar(i, { abierta: true })}>＋ concepto / nota</button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <button className="btn-primario sticky bottom-20 w-full shadow" disabled={pendiente || (!conBloque && fallos === 0)} onClick={guardar}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
        </>
      )}
      {ok && <p className="text-center text-bien">{ok}</p>}
    </div>
  );
}
