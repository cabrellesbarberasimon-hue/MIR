import { leerAjustes } from "@/lib/datos/ajustes";
import { accGuardarAjustes } from "../acciones";

export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const a = await leerAjustes();
  return (
    <form action={accGuardarAjustes} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <section className="caja flex flex-col gap-3">
        <h2 className="titulo">Tarjetas diarias</h2>
        <label className="flex items-center justify-between gap-3">Nuevas por día
          <input name="nuevasPorDia" type="number" min={0} max={200} defaultValue={a.nuevasPorDia} className="campo w-24 text-center" />
        </label>
        <label className="flex items-center justify-between gap-3">Tope total por día
          <input name="maxPorDia" type="number" min={1} max={500} defaultValue={a.maxPorDia} className="campo w-24 text-center" />
        </label>
        <label className="flex items-center justify-between gap-3">Preguntar el motivo al fallar
          <input name="preguntarMotivo" type="checkbox" defaultChecked={a.preguntarMotivo} className="h-6 w-6 accent-acento" />
        </label>
        <label className="flex items-center justify-between gap-3">Revisar las tarjetas generadas antes de usarlas
          <input name="revisionPrevia" type="checkbox" defaultChecked={a.revisionPrevia} className="h-6 w-6 accent-acento" />
        </label>
      </section>
      <button className="btn-primario">Guardar</button>
    </form>
  );
}
