CREATE TYPE "user_roles" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "loki"."users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "loki"."users" ALTER COLUMN "role" SET DATA TYPE "user_roles" USING "role"::text::"user_roles";--> statement-breakpoint
ALTER TABLE "loki"."users" ALTER COLUMN "role" SET DEFAULT 'user'::"user_roles";--> statement-breakpoint
DROP TYPE "user_role";