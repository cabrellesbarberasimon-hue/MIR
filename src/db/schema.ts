// Modelo de datos completo (Fase 1 + Fase 2).
// Convención: fechas "de calendario" como `date` (texto YYYY-MM-DD, hora de España);
// instantes como `timestamp with time zone`.
import {
  pgTable, serial, integer, text, boolean, date, timestamp, real, jsonb,
  uniqueIndex, index,
} from "drizzle-orm/pg-core";

const ahora = () => timestamp({ withTimezone: true }).notNull().defaultNow();

// ───────────── Temario ─────────────

export const asignaturas = pgTable("asignaturas", {
  id: serial().primaryKey(),
  nombre: text().notNull().unique(),
  orden: integer().notNull().default(0),
  creadoEn: ahora(),
});

export const temas = pgTable("temas", {
  id: serial().primaryKey(),
  asignaturaId: integer().notNull().references(() => asignaturas.id, { onDelete: "cascade" }),
  nombre: text().notNull(),
  orden: integer().notNull().default(0),
  realizado: boolean().notNull().default(false),
  realizadoEn: date(),
  notas: text(),
  creadoEn: ahora(),
}, (t) => [uniqueIndex("temas_asig_nombre").on(t.asignaturaId, t.nombre)]);

// Concepto: unidad mínima de conocimiento. Vincula temas, errores y tarjetas.
export const conceptos = pgTable("conceptos", {
  id: serial().primaryKey(),
  temaId: integer().notNull().references(() => temas.id, { onDelete: "cascade" }),
  nombre: text().notNull(),
  nombreNorm: text().notNull(),
  creadoEn: ahora(),
}, (t) => [uniqueIndex("conceptos_tema_norm").on(t.temaId, t.nombreNorm)]);

// ───────────── Planificación (fuente principal del calendario) ─────────────

export const TIPOS_PLAN = ["estudio", "repaso", "preguntas"] as const;

export const planificacion = pgTable("planificacion", {
  id: serial().primaryKey(),
  fecha: date().notNull(),
  temaId: integer().notNull().references(() => temas.id, { onDelete: "cascade" }),
  tipo: text({ enum: TIPOS_PLAN }).notNull().default("estudio"),
  completado: boolean().notNull().default(false),
  creadoEn: ahora(),
}, (t) => [index("plan_fecha").on(t.fecha)]);

// ───────────── Rendimiento, preguntas y errores ─────────────

export const ORIGENES_BLOQUE = ["test", "simulacro", "otro"] as const;

export const bloquesPreguntas = pgTable("bloques_preguntas", {
  id: serial().primaryKey(),
  fecha: date().notNull(),
  temaId: integer().references(() => temas.id, { onDelete: "set null" }),
  origen: text({ enum: ORIGENES_BLOQUE }).notNull().default("test"),
  total: integer().notNull(),
  aciertos: integer().notNull(),
  fallos: integer().notNull(),
  blancos: integer().notNull().default(0),
  nota: text(),
  creadoEn: ahora(),
}, (t) => [index("bloques_fecha").on(t.fecha)]);

export const MOTIVOS_ERROR = [
  "no_lo_sabia", "olvidado", "confusion", "lectura", "razonamiento", "duda",
] as const;
export type MotivoError = (typeof MOTIVOS_ERROR)[number];

export const errores = pgTable("errores", {
  id: serial().primaryKey(),
  fecha: date().notNull(),
  temaId: integer().notNull().references(() => temas.id, { onDelete: "cascade" }),
  conceptoId: integer().references(() => conceptos.id, { onDelete: "set null" }),
  bloqueId: integer().references(() => bloquesPreguntas.id, { onDelete: "cascade" }),
  tarjetaId: integer().references(() => tarjetas.id, { onDelete: "set null" }),
  origen: text({ enum: ["preguntas", "tarjeta"] }).notNull().default("preguntas"),
  motivo: text({ enum: MOTIVOS_ERROR }),
  nota: text(),
  creadoEn: ahora(),
}, (t) => [index("errores_tema").on(t.temaId), index("errores_fecha").on(t.fecha)]);

// Repasos pendientes de temas y errores (capa adicional; nunca toca la planificación).
export const repasos = pgTable("repasos", {
  id: serial().primaryKey(),
  tipo: text({ enum: ["tema", "error"] }).notNull(),
  temaId: integer().notNull().references(() => temas.id, { onDelete: "cascade" }),
  errorId: integer().references(() => errores.id, { onDelete: "cascade" }),
  fecha: date().notNull(),
  hechoEn: timestamp({ withTimezone: true }),
  creadoEn: ahora(),
}, (t) => [index("repasos_fecha").on(t.fecha)]);

// ───────────── Ajustes (fila única id=1) ─────────────

export const ajustes = pgTable("ajustes", {
  id: integer().primaryKey().default(1),
  nuevasPorDia: integer().notNull().default(10),
  maxPorDia: integer().notNull().default(30),
  revisionPrevia: boolean().notNull().default(false),
  preguntarMotivo: boolean().notNull().default(true),
  fechaExamen: date(), // cuenta atrás en "Hoy"
  objetivoPreguntas: integer().notNull().default(0), // preguntas/día (0 = sin objetivo)
});

// Tiempo de estudio (temporizador). Capa de registro: no toca la planificación.
export const sesionesEstudio = pgTable("sesiones_estudio", {
  id: serial().primaryKey(),
  fecha: date().notNull(),
  minutos: integer().notNull(),
  temaId: integer().references(() => temas.id, { onDelete: "set null" }),
  creadoEn: ahora(),
}, (t) => [index("sesiones_fecha").on(t.fecha)]);

// ───────────── Fase 2: manuales y tarjetas ─────────────

export const manuales = pgTable("manuales", {
  id: serial().primaryKey(),
  archivo: text().notNull().unique(), // ruta relativa a MANUALES_DIR
  nombre: text().notNull(),
  asignaturaId: integer().references(() => asignaturas.id, { onDelete: "set null" }),
  hash: text().notNull(),
  paginas: integer().notNull(),
  calidadTexto: text({ enum: ["texto", "mixto", "escaneado"] }).notNull(),
  cargadoEn: ahora(),
});

export const ESTADOS_GENERACION = ["pendiente", "generada", "error", "omitida"] as const;

// Sección = capítulo de un manual. Se asocia a un tema (corregible desde la app).
export const secciones = pgTable("secciones", {
  id: serial().primaryKey(),
  manualId: integer().notNull().references(() => manuales.id, { onDelete: "cascade" }),
  temaId: integer().references(() => temas.id, { onDelete: "set null" }),
  orden: integer().notNull(),
  titulo: text().notNull(),
  paginaInicio: integer().notNull(),
  paginaFin: integer().notNull(),
  // Texto por página: [{ pagina, texto }]
  paginasTexto: jsonb().$type<{ pagina: number; texto: string }[]>().notNull(),
  hash: text().notNull(),
  asociacion: text({ enum: ["auto", "manual"] }).notNull().default("auto"),
  confianza: real().notNull().default(0),
  refsMir: jsonb().$type<number[]>().notNull().default([]),
  prioridad: real().notNull().default(0),
  estado: text({ enum: ESTADOS_GENERACION }).notNull().default("pendiente"),
  error: text(),
  tokensEntrada: integer().notNull().default(0),
  tokensSalida: integer().notNull().default(0),
  generadaEn: timestamp({ withTimezone: true }),
}, (t) => [uniqueIndex("secciones_manual_orden").on(t.manualId, t.orden)]);

export const ESTADOS_TARJETA = ["activa", "pendiente_revision", "mal", "descartada"] as const;

export const tarjetas = pgTable("tarjetas", {
  id: serial().primaryKey(),
  seccionId: integer().references(() => secciones.id, { onDelete: "set null" }),
  temaId: integer().notNull().references(() => temas.id, { onDelete: "cascade" }),
  conceptoId: integer().references(() => conceptos.id, { onDelete: "set null" }),
  pregunta: text().notNull(),
  respuesta: text().notNull(),
  fragmento: text().notNull(), // cita literal del manual
  pagina: integer(),
  refsMir: jsonb().$type<number[]>().notNull().default([]),
  prioridad: real().notNull().default(0),
  estado: text({ enum: ESTADOS_TARJETA }).notNull().default("activa"),
  origen: text({ enum: ["ia", "propia"] }).notNull().default("ia"), // propia = creada por el usuario
  comentarioMal: text(),
  // Estado FSRS
  due: timestamp({ withTimezone: true }).notNull().defaultNow(),
  stability: real().notNull().default(0),
  difficulty: real().notNull().default(0),
  elapsedDays: integer().notNull().default(0),
  scheduledDays: integer().notNull().default(0),
  learningSteps: integer().notNull().default(0),
  reps: integer().notNull().default(0),
  lapses: integer().notNull().default(0),
  state: integer().notNull().default(0), // 0 New, 1 Learning, 2 Review, 3 Relearning
  lastReview: timestamp({ withTimezone: true }),
  creadoEn: ahora(),
}, (t) => [index("tarjetas_due").on(t.estado, t.due), index("tarjetas_tema").on(t.temaId)]);

export const RESPUESTAS_TARJETA = ["sabia", "dudosa", "fallada"] as const;
export type RespuestaTarjeta = (typeof RESPUESTAS_TARJETA)[number];

export const historialTarjetas = pgTable("historial_tarjetas", {
  id: serial().primaryKey(),
  tarjetaId: integer().notNull().references(() => tarjetas.id, { onDelete: "cascade" }),
  fecha: timestamp({ withTimezone: true }).notNull().defaultNow(),
  dia: date().notNull(), // día (España) en que se respondió, para cupos
  respuesta: text({ enum: RESPUESTAS_TARJETA }).notNull(),
  rating: integer().notNull(),
  estadoPrevio: integer().notNull(),
  motivo: text({ enum: MOTIVOS_ERROR }),
  nota: text(), // explicación del error, guardada con la tarjeta
  stability: real().notNull(),
  difficulty: real().notNull(),
  scheduledDays: integer().notNull(),
}, (t) => [index("hist_tarjeta").on(t.tarjetaId), index("hist_dia").on(t.dia)]);
