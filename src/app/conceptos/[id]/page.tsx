import { notFound } from "next/navigation";
import { miniEsquema } from "@/lib/datos/analisis";
import { MiniEsquema } from "@/components/mini-esquema";

export const dynamic = "force-dynamic";

export default async function Concepto({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const e = Number.isInteger(id) ? await miniEsquema(id) : null;
  if (!e) notFound();
  return <MiniEsquema esquema={e} />;
}
