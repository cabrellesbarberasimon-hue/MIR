import Link from "next/link";
import { salir } from "../acciones";

const ENLACES = [
  { href: "/repasos", texto: "Repasos pendientes" },
  { href: "/progreso", texto: "Progreso y conceptos débiles" },
  { href: "/temario", texto: "Temario (asignaturas y temas)" },
  { href: "/diez-minutos", texto: "Tengo 10 minutos" },
  { href: "/tarjetas/revisar", texto: "Revisar tarjetas" },
  { href: "/manuales", texto: "Manuales y asociación con temas" },
  { href: "/ajustes", texto: "Ajustes" },
];

export default function Mas() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Más</h1>
      <ul className="caja divide-y divide-borde p-0">
        {ENLACES.map((e) => (
          <li key={e.href}><Link href={e.href} className="flex min-h-12 items-center justify-between px-4">{e.texto}<span className="text-suave">›</span></Link></li>
        ))}
      </ul>
      <form action={salir}><button className="btn-sec w-full">Cerrar sesión</button></form>
    </div>
  );
}
