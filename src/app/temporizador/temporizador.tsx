"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { accRegistrarEstudio } from "@/app/acciones";
import { SelectorTema, type AsignaturaConTemas } from "@/components/selector-tema";

const PRESETS = [25, 50, 90];

function pitido() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch { /* sin audio */ }
  navigator.vibrate?.([300, 150, 300]);
}

/**
 * Pomodoro: bloques de estudio con descanso. Al terminar un bloque (o al parar) se guardan
 * los minutos estudiados. Usa la hora de fin real, así no se desajusta si el móvil bloquea la pestaña.
 */
export function Temporizador({ temario, temaInicial }: { temario: AsignaturaConTemas[]; temaInicial?: number }) {
  const [duracion, setDuracion] = useState(25);
  const [tema, setTema] = useState<number[]>(temaInicial ? [temaInicial] : []);
  const [fin, setFin] = useState<number | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [descanso, setDescanso] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [aviso, setAviso] = useState<string | null>(null);
  const [, empezar] = useTransition();
  const guardado = useRef(false);

  const guardar = (minutos: number) => {
    if (minutos < 1) return;
    empezar(async () => {
      await accRegistrarEstudio(minutos, tema[0] ?? null);
      setAviso(`Guardados ${minutos} min de estudio.`);
    });
  };

  useEffect(() => {
    if (!fin) return;
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [fin]);

  const restante = fin ? Math.max(0, fin - ahora) : (descanso ? 5 : duracion) * 60_000;
  const mm = Math.floor(restante / 60_000), ss = Math.floor((restante % 60_000) / 1000);
  const texto = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  useEffect(() => {
    document.title = fin ? `${texto} · ${descanso ? "Descanso" : "Estudio"}` : "MIR";
  }, [texto, fin, descanso]);

  useEffect(() => {
    if (!fin || restante > 0 || guardado.current) return;
    guardado.current = true;
    pitido();
    if (!descanso) {
      guardar(duracion);
      setDescanso(true);
    } else {
      setDescanso(false);
      setAviso("Descanso terminado. ¡A por otro bloque!");
    }
    setFin(null);
    setInicio(null);
  });

  const arrancar = () => {
    guardado.current = false;
    setAviso(null);
    const ms = (descanso ? 5 : duracion) * 60_000;
    setInicio(Date.now());
    setFin(Date.now() + ms);
    setAhora(Date.now());
  };

  const parar = () => {
    if (!descanso && inicio) guardar(Math.floor((Date.now() - inicio) / 60_000));
    guardado.current = true;
    setFin(null);
    setInicio(null);
    setDescanso(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="caja flex flex-col items-center gap-2 py-8">
        <p className="sub">{descanso ? "Descanso" : "Estudio"}</p>
        <p className="font-mono text-6xl font-semibold tabular-nums">{texto}</p>
      </div>
      {!fin && !descanso && (
        <div className="flex justify-center gap-2">
          {PRESETS.map((p) => (
            <button key={p} className={`chip ${duracion === p ? "chip-on" : ""}`} onClick={() => setDuracion(p)}>{p} min</button>
          ))}
        </div>
      )}
      {fin ? (
        <button className="btn-sec min-h-14 w-full text-lg" onClick={parar}>{descanso ? "Saltar descanso" : "Parar y guardar"}</button>
      ) : (
        <button className="btn-primario min-h-14 w-full text-lg" onClick={arrancar}>{descanso ? "Empezar descanso (5 min)" : "Empezar"}</button>
      )}
      {descanso && !fin && <button className="sub underline" onClick={() => setDescanso(false)}>Saltar descanso</button>}
      {aviso && <p className="text-center text-bien">{aviso}</p>}
      {!fin && (
        <details className="caja">
          <summary className="sub cursor-pointer">Tema (opcional){tema.length ? " ✓" : ""}</summary>
          <div className="mt-3"><SelectorTema temario={temario} valor={tema} onCambio={setTema} /></div>
        </details>
      )}
    </div>
  );
}
