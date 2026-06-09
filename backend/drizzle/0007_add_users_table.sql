CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
--> statement-breakpoint
ALTER TABLE "budget_binders" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "budget_binders" ADD CONSTRAINT "budget_binders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_binders" DROP COLUMN "password_hash";
