CREATE TABLE "transaction_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"binder_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"object_name" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;