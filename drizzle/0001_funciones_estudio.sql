CREATE TABLE "sesiones_estudio" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"minutos" integer NOT NULL,
	"tema_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ajustes" ADD COLUMN "fecha_examen" date;--> statement-breakpoint
ALTER TABLE "ajustes" ADD COLUMN "objetivo_preguntas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD COLUMN "origen" text DEFAULT 'ia' NOT NULL;--> statement-breakpoint
ALTER TABLE "sesiones_estudio" ADD CONSTRAINT "sesiones_estudio_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sesiones_fecha" ON "sesiones_estudio" USING btree ("fecha");