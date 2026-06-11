ALTER TABLE "merchants" ADD COLUMN "competitor_analysis_cache" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "competitor_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "competitor_analysis_cache" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "opportunity_summary_cache" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "influencer_recs_cache" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "channel_strategy_cache_data" text;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "score_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "competitor_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "influencer_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "channel_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "moments" ADD COLUMN "opportunity_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD COLUMN "pairing_influencer_cache" text;--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD COLUMN "pairing_channel_cache" text;--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD COLUMN "pairing_competitor_cache" text;--> statement-breakpoint
ALTER TABLE "pairing_scores" ADD COLUMN "pairing_cache_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "moment_id" text;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "merchant_id" text;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "business_rationale" text;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "offer_mechanics" text;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "additional_notes" text;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;