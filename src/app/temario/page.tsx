import Link from "next/link";
import { listarTemario } from "@/lib/datos/temario";
import { accCrearAsignatura, accCrearTemas } from "../acciones";
import { CasillaRealizado } from "./casilla-realizado";

export const dynamic = "force-dynamic";

export default async function Temario() {
  const temario = await listarTemario();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Temario</h1>
      {temario.map((a) => {
        const hechos = a.temas.filter((t) => t.realizado).length;
        return (
          <details key={a.id} className="caja p-0">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4">
              <span className="font-medium">{a.nombre}</span>
              <span className="sub">{hechos}/{a.temas.length}</span>
            </summary>
            <ul className="divide-y divide-borde border-t border-borde">
              {a.temas.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2">
                  <CasillaRealizado temaId={t.id} realizado={t.realizado} />
                  <Link href={`/temario/${t.id}`} className="flex-1">{t.nombre}</Link>
                </li>
              ))}
            </ul>
            <form action={accCrearTemas} className="flex flex-col gap-2 border-t border-borde p-4">
              <input type="hidden" name="asignaturaId" value={a.id} />
              <textarea name="nombres" className="campo min-h-20 py-2" placeholder={"Añadir temas (uno por línea)"} />
              <button className="btn-sec">Añadir temas</button>
            </form>
          </details>
        );
      })}
      <form action={accCrearAsignatura} className="caja flex gap-2">
        <input name="nombre" className="campo" placeholder="Nueva asignatura" required />
        <button className="btn-primario">Crear</button>
      </form>
    </div>
  );
}
