# Pendiente (requiere tu intervención)

Todo lo demás está hecho, probado y subido a `main`.

## 1. 🔴 Bloqueante ahora mismo: pega la DATABASE_URL en .env
Estoy trabajando en local (esta sesión, en tu PC) siguiendo docs/TRASPASO.md. Ya cloné el repo, hice
`npm install`, creé `.env` desde `.env.example` y analicé tus manuales reales (`npm run analizar-manuales`).
Para seguir (cargar capítulos → temas y escribir tarjetas) necesito que pegues en `.env` la cadena de Neon:
Vercel → `mir-estudio` → *Storage* → tu base → *Open in Neon* → *Connect* → copia la cadena (`postgresql://…`)
→ pégala en la línea `DATABASE_URL=` de `C:\Users\Simo\OneDrive - BoCubi\Escritorio\MIR\.env`.
(`APP_PASSWORD` y `SESSION_SECRET` de ese `.env` los generé yo para uso local; no son los de producción.)

**Intenté obtenerla yo con la cuenta de Vercel conectada** (me diste permiso para `vercel login` / `env pull`):
esa cuenta (`simon@bocubimobiliario.com`, vía el conector de Vercel, sin `vercel login` de terminal) tiene 10
proyectos y **ninguno es `mir-estudio`** (sí hay un `mir-project`, creado hace poco, deploy en ERROR, dominio
`mir-project-rust.vercel.app` — no tiene relación con `mir-estudio.vercel.app`, que sigue vivo y sirve la app
real). No lo he tocado por si es algo tuyo de otra prueba. El proyecto real debe de estar en otra cuenta/equipo
de Vercel (quizá entraste con GitHub en vez de con el email la vez que lo creaste). Más fácil que lo pegues tú.

## 2. Decide qué hacer con LIBRO GORDO.pdf y LG IMAGENES.pdf
Por defecto los dejo fuera de la carga (ver docs/analisis-manuales.md):
- **LIBRO GORDO.pdf**: no es un manual por especialidad, es un recopilatorio de preguntas de examen 2016-2025
  comentadas; cargarlo tal cual crearía una asignatura ficticia "Libro gordo" con 245 capítulos mezclando todas
  las especialidades. Si quieres aprovechar su contenido, dime cómo lo prefieres (p. ej. asociar sus capítulos
  a los temas de especialidad ya existentes en vez de a una asignatura nueva) y lo ajusto.
- **LG IMAGENES.pdf**: está escaneado (sin texto extraíble), no generaría ninguna tarjeta. Necesitaría OCR
  antes de ser útil; dime si quieres que lo intente o si lo dejamos fuera sin más.

## 3. ⚠️ Hacer privado el repositorio de GitHub (urgente, pendiente de antes)
El repositorio `cabrellesbarberasimon-hue/MIR` **es público** y no puedo cambiar su visibilidad sin sesión de
`gh` autenticada como tú. No contiene manuales, datos derivados ni claves (el `.gitignore` los excluye), pero
debe ser privado:
- Web: GitHub → repo → Settings → General → Danger Zone → *Change visibility* → Private.
- O bien: `gh repo edit cabrellesbarberasimon-hue/MIR --visibility private --accept-visibility-change-consequences`

## 4. PRODUCT_SPEC.md (pendiente de antes)
No está en el repositorio ni en este PC. La app se construyó a partir de tu prompt original (que resume las
secciones 13, 14, 14.5 y 15). Si lo tienes, súbelo al repo y te digo si algo difiere de DECISIONS.md (motivos
de error, intervalos de repaso 1/7/30 días, contenido del modo 10 minutos y de los mini-esquemas).

## Ya hecho (contexto, no requiere acción)
- Código en `main`: desplegado en **https://mir-estudio.vercel.app** (proyecto `mir-estudio`, región
  Frankfurt); cada push a `main` redespliega y aplica migraciones. Acceso con `APP_PASSWORD` (configúrala en
  Vercel → Settings → Environment Variables si quieres cambiarla).
- Generación de tarjetas: vamos por la vía **sin API** (`npm run tarjetas-sin-api`, redactadas por mí,
  validadas igual que las de la API — cita literal obligatoria). No hace falta `ANTHROPIC_API_KEY`.
