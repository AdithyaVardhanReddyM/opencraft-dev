CREATE TYPE "public"."design_system_source" AS ENUM('web', 'css', 'manual');--> statement-breakpoint
CREATE TABLE "design_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"source" "design_system_source" DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"tokens" jsonb NOT NULL,
	"preview_colors" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "design_systems_by_user_id" ON "design_systems" USING btree ("user_id");