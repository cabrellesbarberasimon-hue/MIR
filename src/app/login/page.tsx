"use client";
import { useActionState } from "react";
import { entrar } from "../acciones";

export default function Login() {
  const [estado, accion, enviando] = useActionState(entrar, null);
  return (
    <form action={accion} className="mx-auto mt-24 flex max-w-xs flex-col gap-3">
      <h1 className="text-2xl font-semibold">MIR</h1>
      <input name="contrasena" type="password" autoFocus required placeholder="Contraseña" className="campo" autoComplete="current-password" />
      <button className="btn-primario" disabled={enviando}>Entrar</button>
      {estado?.error && <p className="text-sm text-mal">{estado.error}</p>}
    </form>
  );
}
