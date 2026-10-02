# MIR — planificación, errores, repasos y tarjetas

App web mobile-first para preparar el MIR: planificación por días, registro rápido de preguntas y errores,
repasos pendientes, progreso, modo "Tengo 10 minutos" y tarjetas generadas de tus manuales con repaso FSRS.

- Principios y estructura: [CLAUDE.md](CLAUDE.md) · Decisiones: [DECISIONS.md](DECISIONS.md) ·
  Pendiente: [PENDIENTE.md](PENDIENTE.md) · Manuales: [docs/analisis-manuales.md](docs/analisis-manuales.md)

## Arrancar en local
Requisitos: Node 20+ y un Postgres (local o Neon).
```bash
npm install
cp .env.example .env        # rellena DATABASE_URL, APP_PASSWORD y SESSION_SECRET (openssl rand -hex 32)
npm run db:migrate          # crea las tablas
npm run dev                 # http://localhost:3000 (entra con APP_PASSWORD)
```
Comprobaciones: `npm test` (Vitest + Postgres en memoria, no necesita BD), `npm run lint` (tipos), `npm run build`.

Tras cambiar `src/db/schema.ts`: `npm run db:generate` (crea la migración en `drizzle/`) y `npm run db:migrate`.

## Desplegar (Vercel + Neon)
1. Repositorio privado en GitHub e importado en Vercel (`vercel link`).
2. Base de datos: integración Neon de Vercel (define `DATABASE_URL`).
3. Variables de entorno en Vercel: `APP_PASSWORD`, `SESSION_SECRET`.
4. Push a `main` o `vercel --prod`. El build aplica las migraciones automáticamente.

Comandos exactos en [PENDIENTE.md](PENDIENTE.md#4-base-de-datos-y-despliegue-en-vercel-no-hay-sesión-de-vercel-en-este-entorno).

## Manuales y tarjetas (scripts locales)
La app desplegada no lee los manuales. Los scripts se ejecutan en tu ordenador y escriben en la misma base de
datos (`DATABASE_URL` en `.env`). La carpeta de manuales (`MANUALES_DIR`, por defecto `~/Desktop/manuales`) solo
se lee; nada derivado de ella se sube a git.

```bash
npm run analizar-manuales                          # informe en privado/analisis-manuales.md
npm run cargar-manuales                            # capítulos → temas, refs MIR y prioridad (idempotente)
npm run generar-tarjetas -- --estimar              # coste estimado
npm run generar-tarjetas -- --seccion 12 --seco --muestra   # prueba un capítulo sin guardar
npm run generar-tarjetas                           # genera lo pendiente (reanudable)
npm run generar-tarjetas -- --todo                 # incluye temas sin planificación aunque cueste > 20 €
```
Necesita `ANTHROPIC_API_KEY` en `.env`. Otras opciones: `--manual "texto"`, `--limite N`,
`--esfuerzo low|medium|high`, `--simulado` (sin IA ni escritura, para probar el flujo).

Cada tarjeta guarda la cita literal del manual y su página; las propuestas cuya cita no aparece en el texto se
descartan. Las asociaciones capítulo → tema se corrigen en la app (Más → Manuales). Con "Revisar las tarjetas
generadas" activado en Ajustes, las nuevas quedan pendientes de aceptar en Más → Revisar tarjetas.

## Qué queda pendiente
Ver [PENDIENTE.md](PENDIENTE.md): hacer privado el repo, desplegar en Vercel/Neon, añadir la clave de Anthropic,
ejecutar el análisis real de los manuales y generar las tarjetas (con revisión previa de un capítulo de prueba).
