CREATE TABLE "moment_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"feed_candidate_id" text NOT NULL,
	"campaign_name" text,
	"last_year_campaign_url" text,
	"inspiration_urls" text,
	"notes" text,
	"target_quarter" text,
	"priority_merchants" text,
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_notes" text,
	"status" text DEFAULT 'in_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pitch_merchants" (
	"id" text PRIMARY KEY NOT NULL,
	"pitch_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pitch_moments" (
	"id" text PRIMARY KEY NOT NULL,
	"pitch_id" text NOT NULL,
	"moment_id" text NOT NULL,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pitches" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'moment_led' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"situation" text,
	"campaign_concept" text,
	"campaign_headline" text,
	"key_messages" text,
	"channel_strategy" text,
	"influencer_strategy" text,
	"next_steps" text,
	"target_quarter" text,
	"attachments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "partner_status" text DEFAULT 'existing' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "partner_group" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "merchant_signals" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "past_campaign_notes" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "quarter" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "feed_candidate_id" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "ecommerce_score" real;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "audience_fit" real;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "white_space_score" real;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "score_rationale" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "channel_recommendations" text;--> statement-breakpoint
ALTER TABLE "moment_reviews" ADD CONSTRAINT "moment_reviews_feed_candidate_id_feed_candidates_id_fk" FOREIGN KEY ("feed_candidate_id") REFERENCES "public"."feed_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_merchants" ADD CONSTRAINT "pitch_merchants_pitch_id_pitches_id_fk" FOREIGN KEY ("pitch_id") REFERENCES "public"."pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_merchants" ADD CONSTRAINT "pitch_merchants_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_moments" ADD CONSTRAINT "pitch_moments_pitch_id_pitches_id_fk" FOREIGN KEY ("pitch_id") REFERENCES "public"."pitches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitch_moments" ADD CONSTRAINT "pitch_moments_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_scores" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "pairing_scores" DROP COLUMN "updated_at";