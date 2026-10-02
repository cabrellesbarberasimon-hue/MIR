# CLAUDE.md — App MIR

Aplicación web para estudiantes que preparan el MIR. `PRODUCT_SPEC.md` es la fuente de verdad del producto
(ver PENDIENTE.md: no estaba disponible en el entorno de desarrollo inicial). Léelo entero antes de cambiar funcionalidad.

## Principios (no negociables)
- Simplicidad y mantenibilidad. No añadir funciones que no estén en la spec.
- La planificación del usuario es la fuente principal del calendario. La app NUNCA la modifica automáticamente.
- Repasos y tarjetas son una capa adicional sobre la planificación, no un sistema paralelo.
- Interfaz extremadamente sencilla, rápida, nada recargada (se usa muchas horas al día). Mobile-first.
- Registrar un error o responder una tarjeta: el mínimo de toques posible.
- Datos estructurados para analizarlos después con IA. Entidad "concepto" vinculada a temas, errores y tarjetas.
- Trabajo autónomo: cada decisión técnica relevante se registra en DECISIONS.md (una línea con el porqué).
  Lo que requiera al usuario (claves, inicios de sesión) va a PENDIENTE.md.

## Manuales (privados)
- Carpeta de manuales (`MANUALES_DIR`; en el PC del usuario: `C:\Users\Simo\OneDrive - BoCubi\Escritorio\MANUALES`): SOLO LECTURA. Nunca modificar, mover ni borrar.
- Nunca copiar manuales al repo ni subir nada derivado de ellos (tarjetas, textos, muestras). `.gitignore` lo cubre
  (`privado/`, `docs/muestra-tarjetas.md`, `*.pdf`).
- La app desplegada no lee manuales: los scripts locales (`npm run cargar-manuales`, `npm run generar-tarjetas`)
  escriben directamente en la base de datos. Procesan capítulo a capítulo, son reanudables y no regeneran lo existente.
- Cada tarjeta guarda el fragmento literal del manual y su página, y no puede contener nada que no esté en él.

## Decisiones fijas (sección 15 de la spec)
- Cupo diario: 10 nuevas, tope total 30 (configurable en Ajustes).
- Referencias MIR recientes pesan algo más que las antiguas en la prioridad.
- Revisión previa de tarjetas generadas: desactivada por defecto, activable.
- Motivo del error al fallar una tarjeta: opcional (se salta con un toque).
- FSRS (ts-fsrs). Fallada → Again, Dudosa → Hard, La sabía → Good.

## Stack y estructura
- Next.js 16 (App Router, server actions) + TypeScript + Tailwind 4. Despliegue en Vercel.
- Postgres (Neon) con Drizzle ORM (`src/db/schema.ts`, migraciones en `drizzle/`).
- Auth: contraseña única (`APP_PASSWORD`) + cookie firmada (`SESSION_SECRET`), `src/proxy.ts`.
- Lógica de dominio en `src/lib/` (funciones puras o que reciben datos de `getDb()`); tests en `tests/` con Vitest
  y PGlite (Postgres en memoria, sin servidor).
- Scripts locales en `scripts/` (lógica en `src/lib/manuales/`: pdf, estructura, fragmentos, generador, procesar, coste).
- Pantallas en `src/app/` (server components + server actions en `src/app/acciones.ts`); todas mobile-first.
- `.gitignore`: las reglas de datos privados van ancladas a la raíz (`/privado/`…) para no ocultar código
  como `src/lib/datos` o `src/lib/manuales`.

## Comandos
- `npm run dev` · `npm test` · `npm run lint` (tsc) · `npm run build`
- `npm run db:generate` (tras cambiar el schema) · `npm run db:migrate`
- `npm run analizar-manuales` · `npm run cargar-manuales` · `npm run generar-tarjetas` · `npm run tarjetas-sin-api`
- Traspaso a Claude en local: `docs/TRASPASO.md`

## Generación de tarjetas
- Prompt en `src/lib/manuales/generador.ts` (`PROMPT_SISTEMA`, `VERSION_PROMPT`). Reglas 14.5: un concepto por tarjeta,
  respuesta concisa, sin redundancias, contexto suficiente, solo del fragmento.
- `validar()` descarta toda tarjeta cuya `cita` no esté literalmente en el fragmento; la cita es el fragmento guardado.
- Si la estimación supera 20 €, solo temas con planificación salvo `--todo`.

## Forma de trabajar
Commits pequeños y frecuentes. Comprobar cada parte (tests + prueba manual) antes de seguir.
