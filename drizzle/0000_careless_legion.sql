-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"seasonal_notes" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"hook" text,
	"score" real,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pairing_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"moment_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"relevance_score" real NOT NULL,
	"campaign_angle" text NOT NULL,
	"rationale" text,
	"created_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pairing_scores_moment_id_merchant_id_unique" UNIQUE("moment_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "feed_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"category" text NOT NULL,
	"score" real NOT NULL,
	"headline" text NOT NULL,
	"body" text NOT NULL,
	"why" text NOT NULL,
	"hook" text NOT NULL,
	"partners" text NOT NULL,
	"personas" text NOT NULL,
	"hashtags" text NOT NULL,
	"competing" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD CONSTRAINT "pairing_scores_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD CONSTRAINT "pairing_scores_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
*/