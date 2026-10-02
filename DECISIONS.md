# Decisiones técnicas

Una línea por decisión, con el porqué. Las más recientes al final.

## Entorno y alcance
- PRODUCT_SPEC.md no estaba en el repositorio ni en el entorno: se ha construido a partir del prompt (que resume las secciones 13, 14, 14.5 y 15). Lo que la spec pueda detallar distinto queda anotado en PENDIENTE.md para revisarlo.
- La carpeta de manuales no existe en el entorno de desarrollo (sesión en la nube, no tu Mac): el análisis real lo hace `npm run analizar-manuales` en tu ordenador; el parser se diseñó para ser robusto sin haber visto los PDF (índice del PDF → encabezados "Tema N" → manual completo).

## Stack
- Next.js 16 (App Router + server actions) con TypeScript: lo pedido; las server actions evitan escribir una API aparte.
- Postgres en Neon: integración nativa con Vercel (Marketplace), plan gratuito suficiente y la variable DATABASE_URL se configura sola.
- Drizzle ORM + driver `postgres`: sin binarios nativos (a diferencia de Prisma), migraciones SQL legibles en `drizzle/`, funciona igual en local, Neon y PGlite.
- Autenticación con una única contraseña (APP_PASSWORD) y cookie firmada HMAC (SESSION_SECRET), comprobada en `src/proxy.ts` y en cada server action: app de un solo usuario; es lo más sencillo de configurar y mantener (sin proveedor OAuth ni tabla de usuarios).
- Tailwind 4 con variables CSS y modo oscuro automático: estilos mínimos sin librería de componentes.
- Tests con Vitest y PGlite (Postgres en memoria con las migraciones reales): no requieren servidor de base de datos.
- `npm run build` aplica las migraciones antes de compilar si hay DATABASE_URL: el esquema de producción se actualiza solo en cada despliegue.
- Fechas de calendario como `date` en hora de Europe/Madrid: el "hoy" del usuario no depende de la zona horaria del servidor de Vercel.

## Modelo de datos
- Tablas: asignaturas, temas, conceptos, planificacion, bloques_preguntas, errores, repasos, ajustes (Fase 1); manuales, secciones, tarjetas, historial_tarjetas (Fase 2). Todo creado desde la primera migración.
- Concepto pertenece a un tema y se identifica por nombre normalizado (sin tildes/mayúsculas): evita duplicados al escribir rápido y permite vincular errores y tarjetas.
- Un fallo de tarjeta crea también un registro en `errores` (origen "tarjeta"): un único sitio para analizar errores y conceptos débiles.
- `bloques_preguntas` guarda el rendimiento (total/aciertos/fallos/blancos); los errores pueden ir con bloque o sueltos.
- El texto de cada capítulo se guarda por página en `secciones.paginas_texto` (jsonb): permite regenerar sin volver a leer el PDF y conservar la página exacta de cada tarjeta. Es dato privado: la exportación lo omite.
- Estado FSRS en columnas de `tarjetas` (no JSON): consultas de "vencidas" indexables.

## Funcionalidad (Fase 1)
- Marcar como hecha una entrada de estudio del plan marca el tema como realizado: es la acción natural y ahorra un toque. Nunca se mueve ni crea planificación automáticamente; "→" (pasar al día siguiente) solo actúa si el usuario lo pulsa.
- Repasos de tema a 1, 7 y 30 días tras marcarlo realizado; cada error se repasa al día siguiente; la lista agrupa por tema y se marca entero con un toque. Son una capa aparte: no tocan la planificación.
- Registro: nº de preguntas + aciertos (+ blancos) crea tantos errores como fallos; el motivo es opcional, con "Aplicar a todos" para registrar en bloque y concepto/nota desplegables.
- Motivos de error fijos (6): no lo sabía, olvidado, confusión, lectura, razonamiento, duda. Lista corta para elegir con un toque y analizable después.
- Conceptos débiles: errores de los últimos 60 días por concepto, con doble peso los de los últimos 7 días.
- Mini-esquemas sin IA: para un concepto, sus tarjetas (pregunta → respuesta) y tus notas de error. Cumple el objetivo sin coste ni riesgo de inventar.
- Modo "Tengo 10 minutos": hasta 10 tarjetas + el mini-esquema del concepto más débil + errores recientes con nota + repasos pendientes.
- Exportación JSON completa (/api/exportar) para análisis con IA; no añade pantallas.

## Funcionalidad (Fase 2)
- FSRS con `ts-fsrs` (fuzz activado). Fallada → Again, Dudosa → Hard, La sabía → Good.
- Cupo: las tarjetas en aprendizaje ya vistas hoy no gastan cupo; las vencidas consumen el tope total (30); las nuevas, el cupo de nuevas (10) dentro del tope.
- Las tarjetas nuevas solo entran de temas realizados o planificados hasta hoy, ordenadas por prioridad MIR: así las tarjetas acompañan a la planificación en vez de ir por libre.
- Si no queda nada, se adelantan tarjetas en aprendizaje que vencen en < 20 min para no dejar la sesión a medias.
- Prioridad MIR = Σ pesos de sus referencias; peso = 1 + 0,5·max(0, 1 − antigüedad/10): una referencia del año en curso pesa 1,5 y una de hace ≥10 años, 1.
- Referencias MIR: se aceptan años de 2 y 4 cifras, listas con coma/punto y coma/"y" y convocatorias "18-19" (cuenta el segundo año, el del examen). Números de 3 cifras se ignoran (suelen ser nº de pregunta).
- Capítulos: se prefieren los marcadores del PDF; si no hay, encabezados "Tema N"/"Capítulo N" en las primeras líneas de página; si no, el manual entero. Se asume que cada capítulo empieza en página nueva.
- Asociación capítulo → tema por similitud de palabras (Dice) dentro de la asignatura; umbral 0,5 (asignatura 0,6). Si no hay coincidencia se crea el tema. La corrección manual mueve las tarjetas del capítulo.
- Generación: una petición por lote de ~14.000 caracteres de fragmentos numerados; salida estructurada (Zod) con `cita` literal; el código verifica que la cita existe en el fragmento y la guarda como fragmento exacto con su página. Las tarjetas sin cita verificable se descartan: garantía determinista de "solo información del fragmento".
- Las referencias MIR de cada tarjeta se detectan en su cita y el resto de su frase (donde suele ir "(MIR 21)").
- Deduplicación por solapamiento de palabras con las preguntas existentes del tema.
- Reanudable: cada capítulo se guarda en una transacción (todo o nada) y su estado (pendiente/generada/error) evita regenerarlo; Ctrl+C termina el capítulo en curso.
- Modelo `claude-opus-5-5` (el recomendado por defecto), esfuerzo "medium" configurable con `--esfuerzo`; no se usa Batch API para mantener el script simple y reanudable capítulo a capítulo.
- Sin `fallbacks` de rechazo del servidor: con contenido médico de manual es improbable; si ocurre, el capítulo queda en "error" y se puede reintentar.
- Si la estimación supera 20 €, el script procesa solo los temas con planificación salvo `--todo` (regla del prompt).
- La muestra de tarjetas y el análisis real de manuales se escriben en `docs/muestra-tarjetas.md` y `privado/`, ignorados por git: derivan de los manuales y son privados.

## Despliegue y Windows
- Despliegue documentado desde el panel web de Vercel (sin CLI): es lo más sencillo en Windows y no requiere instalar nada.
- Migraciones con `DATABASE_URL_UNPOOLED` si existe (la crea la integración de Neon): las migraciones van mejor sin pooler.
- `MANUALES_DIR` admite rutas de Windows con espacios y comillas; las rutas de los manuales se guardan con "/" para que el mismo manual se reconozca desde cualquier sistema.
- Acceso de otra persona: se comparte el dominio de producción y `APP_PASSWORD`; la app sigue siendo de un único usuario (no hace falta sistema de cuentas para el caso descrito).
- `MANUALES.bat` + PowerShell (compatible con 5.1, `.env` sin BOM): un doble clic en Windows sustituye a instalar Git y usar la terminal.
- Los PDF con nombre de examen/simulacro/plantilla se omiten al cargar: no son manuales y crearían asignaturas falsas; la spec no incluye banco de preguntas.
- Se elimina `channel_binding` de la URL de Neon antes de conectar: el driver `postgres` lo envía como parámetro de servidor y Postgres lo rechaza.

- `tarjetas-sin-api`: el asistente local redacta las tarjetas y se importan con la misma validación que las de la API (cita literal), sin coste de API.

## Traspaso a Claude en local (Windows)
- Se trabaja sobre la rama `main` (igual que `claude/nice-cerf-5ybw3q`, que queda como estaba): es la que despliega Vercel.
- Test `resuelve rutas con comillas y ~` comparaba con una ruta POSIX fija (`/tmp/a b`): en Windows `path.resolve()` la trata como relativa a la unidad actual y el test fallaba sin que hubiera ningún fallo real en `resolverDir`. Se reescribió para comparar contra `path.resolve()` del propio sistema.

## Funciones de estudio añadidas a petición del usuario
- Cuenta atrás al MIR y objetivo diario de preguntas (Ajustes) con barra de progreso y racha en "Hoy": motivación sin ruido.
- Racha: días seguidos cumpliendo el objetivo (o, sin objetivo, con cualquier actividad); hoy no la rompe hasta que acaba el día.
- Temporizador Pomodoro (25/50/90 + descanso de 5) que guarda los minutos en `sesiones_estudio`; usa hora de fin real para no desajustarse si el móvil bloquea la pestaña.
- Notas por tema (campo `temas.notas` ya existente) y tarjetas propias (`tarjetas.origen = 'propia'`, sin fragmento), también creadas desde un error: lo que fallas se convierte en repaso FSRS.
- Buscador global sin tildes (temas y sus notas, conceptos, notas de errores, tarjetas) con `translate/lower` en SQL: sin índices extra, suficiente para un usuario.
