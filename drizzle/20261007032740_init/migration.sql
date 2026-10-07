CREATE SCHEMA "loki";
--> statement-breakpoint
CREATE TABLE "loki"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL
);
--> statement-breakpoint
DROP TABLE "users_nest";