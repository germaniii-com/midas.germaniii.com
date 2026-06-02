CREATE TABLE "payment_schedule_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"binder_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"transaction_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payment_schedule_occurrences_schedule_id_due_date_unique" UNIQUE("schedule_id","due_date")
);
--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "name" varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "repeat_interval" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "repeat_type" varchar(10) NOT NULL DEFAULT 'month';--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "start_date" date;--> statement-breakpoint
UPDATE "payment_schedules" SET "start_date" = "next_due_date" WHERE "start_date" IS NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "end_type" varchar(10) DEFAULT 'never' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "end_occurrences" integer;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "specific_days" jsonb;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "weekend_adjustment" varchar(10) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "notify_before" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "notify_type" varchar(10) DEFAULT 'days';--> statement-breakpoint
ALTER TABLE "payment_schedules" DROP COLUMN "frequency";--> statement-breakpoint
ALTER TABLE "payment_schedules" DROP COLUMN "next_due_date";--> statement-breakpoint
ALTER TABLE "payment_schedule_occurrences" ADD CONSTRAINT "payment_schedule_occurrences_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedule_occurrences" ADD CONSTRAINT "payment_schedule_occurrences_schedule_id_payment_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."payment_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedule_occurrences" ADD CONSTRAINT "payment_schedule_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;