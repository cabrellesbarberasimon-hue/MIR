CREATE TABLE "ajustes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nuevas_por_dia" integer DEFAULT 10 NOT NULL,
	"max_por_dia" integer DEFAULT 30 NOT NULL,
	"revision_previa" boolean DEFAULT false NOT NULL,
	"preguntar_motivo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asignaturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asignaturas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "bloques_preguntas" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"tema_id" integer,
	"origen" text DEFAULT 'test' NOT NULL,
	"total" integer NOT NULL,
	"aciertos" integer NOT NULL,
	"fallos" integer NOT NULL,
	"blancos" integer DEFAULT 0 NOT NULL,
	"nota" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conceptos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tema_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"nombre_norm" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errores" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"tema_id" integer NOT NULL,
	"concepto_id" integer,
	"bloque_id" integer,
	"tarjeta_id" integer,
	"origen" text DEFAULT 'preguntas' NOT NULL,
	"motivo" text,
	"nota" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_tarjetas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tarjeta_id" integer NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"dia" date NOT NULL,
	"respuesta" text NOT NULL,
	"rating" integer NOT NULL,
	"estado_previo" integer NOT NULL,
	"motivo" text,
	"nota" text,
	"stability" real NOT NULL,
	"difficulty" real NOT NULL,
	"scheduled_days" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuales" (
	"id" serial PRIMARY KEY NOT NULL,
	"archivo" text NOT NULL,
	"nombre" text NOT NULL,
	"asignatura_id" integer,
	"hash" text NOT NULL,
	"paginas" integer NOT NULL,
	"calidad_texto" text NOT NULL,
	"cargado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manuales_archivo_unique" UNIQUE("archivo")
);
--> statement-breakpoint
CREATE TABLE "planificacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"tema_id" integer NOT NULL,
	"tipo" text DEFAULT 'estudio' NOT NULL,
	"completado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repasos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"tema_id" integer NOT NULL,
	"error_id" integer,
	"fecha" date NOT NULL,
	"hecho_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"manual_id" integer NOT NULL,
	"tema_id" integer,
	"orden" integer NOT NULL,
	"titulo" text NOT NULL,
	"pagina_inicio" integer NOT NULL,
	"pagina_fin" integer NOT NULL,
	"paginas_texto" jsonb NOT NULL,
	"hash" text NOT NULL,
	"asociacion" text DEFAULT 'auto' NOT NULL,
	"confianza" real DEFAULT 0 NOT NULL,
	"refs_mir" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prioridad" real DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"error" text,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_salida" integer DEFAULT 0 NOT NULL,
	"generada_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tarjetas" (
	"id" serial PRIMARY KEY NOT NULL,
	"seccion_id" integer,
	"tema_id" integer NOT NULL,
	"concepto_id" integer,
	"pregunta" text NOT NULL,
	"respuesta" text NOT NULL,
	"fragmento" text NOT NULL,
	"pagina" integer,
	"refs_mir" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prioridad" real DEFAULT 0 NOT NULL,
	"estado" text DEFAULT 'activa' NOT NULL,
	"comentario_mal" text,
	"due" timestamp with time zone DEFAULT now() NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" integer DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temas" (
	"id" serial PRIMARY KEY NOT NULL,
	"asignatura_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"realizado" boolean DEFAULT false NOT NULL,
	"realizado_en" date,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bloques_preguntas" ADD CONSTRAINT "bloques_preguntas_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conceptos" ADD CONSTRAINT "conceptos_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errores" ADD CONSTRAINT "errores_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errores" ADD CONSTRAINT "errores_concepto_id_conceptos_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."conceptos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errores" ADD CONSTRAINT "errores_bloque_id_bloques_preguntas_id_fk" FOREIGN KEY ("bloque_id") REFERENCES "public"."bloques_preguntas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "errores" ADD CONSTRAINT "errores_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_tarjetas" ADD CONSTRAINT "historial_tarjetas_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuales" ADD CONSTRAINT "manuales_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificacion" ADD CONSTRAINT "planificacion_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repasos" ADD CONSTRAINT "repasos_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repasos" ADD CONSTRAINT "repasos_error_id_errores_id_fk" FOREIGN KEY ("error_id") REFERENCES "public"."errores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_manual_id_manuales_id_fk" FOREIGN KEY ("manual_id") REFERENCES "public"."manuales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_seccion_id_secciones_id_fk" FOREIGN KEY ("seccion_id") REFERENCES "public"."secciones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_concepto_id_conceptos_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."conceptos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temas" ADD CONSTRAINT "temas_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bloques_fecha" ON "bloques_preguntas" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "conceptos_tema_norm" ON "conceptos" USING btree ("tema_id","nombre_norm");--> statement-breakpoint
CREATE INDEX "errores_tema" ON "errores" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX "errores_fecha" ON "errores" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "hist_tarjeta" ON "historial_tarjetas" USING btree ("tarjeta_id");--> statement-breakpoint
CREATE INDEX "hist_dia" ON "historial_tarjetas" USING btree ("dia");--> statement-breakpoint
CREATE INDEX "plan_fecha" ON "planificacion" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "repasos_fecha" ON "repasos" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "secciones_manual_orden" ON "secciones" USING btree ("manual_id","orden");--> statement-breakpoint
CREATE INDEX "tarjetas_due" ON "tarjetas" USING btree ("estado","due");--> statement-breakpoint
CREATE INDEX "tarjetas_tema" ON "tarjetas" USING btree ("tema_id");--> statement-breakpoint
CREATE UNIQUE INDEX "temas_asig_nombre" ON "temas" USING btree ("asignatura_id","nombre");