CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"screen_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"model_id" text,
	"image_ids" text[],
	"reasoning_details" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"style_guide" text,
	"sketches_data" jsonb,
	"viewport_data" jsonb,
	"canvas_version" text,
	"generated_design_data" jsonb,
	"thumbnail" text,
	"mood_board_images" text[],
	"inspiration_images" text[],
	"last_modified" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"is_public" boolean,
	"tags" text[],
	"project_number" integer NOT NULL,
	"frame_counter" integer,
	"selected_ids" jsonb,
	"tool" text
);
--> statement-breakpoint
CREATE TABLE "reasoning_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_call_id" text NOT NULL,
	"details" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shape_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text,
	"sandbox_url" text,
	"sandbox_id" text,
	"files" jsonb,
	"theme" text,
	"parent_screen_id" uuid,
	"route" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"generations_used" integer DEFAULT 0 NOT NULL,
	"generations_limit" integer DEFAULT 10 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_parent_screen_id_screens_id_fk" FOREIGN KEY ("parent_screen_id") REFERENCES "public"."screens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_by_screen_id" ON "messages" USING btree ("screen_id");--> statement-breakpoint
CREATE INDEX "projects_by_user_id" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reasoning_tokens_by_tool_call_id" ON "reasoning_tokens" USING btree ("tool_call_id");--> statement-breakpoint
CREATE INDEX "reasoning_tokens_by_created_at" ON "reasoning_tokens" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "screens_by_shape_id" ON "screens" USING btree ("shape_id");--> statement-breakpoint
CREATE INDEX "screens_by_project_id" ON "screens" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_by_clerk_id" ON "users" USING btree ("clerk_id");