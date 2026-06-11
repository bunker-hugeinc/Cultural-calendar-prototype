import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const db = neon(process.env.DATABASE_URL!);

const statements = [
  `ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "competitor_analysis_cache" text`,
  `ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "competitor_cache_generated_at" timestamp`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "competitor_analysis_cache" text`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "opportunity_summary_cache" text`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "influencer_recs_cache" text`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "channel_strategy_cache_data" text`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "score_cache_generated_at" timestamp`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "competitor_cache_generated_at" timestamp`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "influencer_cache_generated_at" timestamp`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "channel_cache_generated_at" timestamp`,
  `ALTER TABLE "moments" ADD COLUMN IF NOT EXISTS "opportunity_cache_generated_at" timestamp`,
  `ALTER TABLE "pairing_scores" ADD COLUMN IF NOT EXISTS "pairing_influencer_cache" text`,
  `ALTER TABLE "pairing_scores" ADD COLUMN IF NOT EXISTS "pairing_channel_cache" text`,
  `ALTER TABLE "pairing_scores" ADD COLUMN IF NOT EXISTS "pairing_competitor_cache" text`,
  `ALTER TABLE "pairing_scores" ADD COLUMN IF NOT EXISTS "pairing_cache_generated_at" timestamp`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "moment_id" text`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "merchant_id" text`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "business_rationale" text`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "offer_mechanics" text`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "additional_notes" text`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "sent_at" timestamp`,
  `ALTER TABLE "pitches" ADD COLUMN IF NOT EXISTS "approved_at" timestamp`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'pitches_moment_id_moments_id_fk'
    ) THEN
      ALTER TABLE "pitches" ADD CONSTRAINT "pitches_moment_id_moments_id_fk"
        FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'pitches_merchant_id_merchants_id_fk'
    ) THEN
      ALTER TABLE "pitches" ADD CONSTRAINT "pitches_merchant_id_merchants_id_fk"
        FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE no action ON UPDATE no action;
    END IF;
  END $$`,
];

async function run() {
  for (const stmt of statements) {
    try {
      await db.query(stmt);
      console.log("OK:", stmt.slice(0, 80));
    } catch (e: any) {
      console.error("ERR:", stmt.slice(0, 80), e.message);
    }
  }
  console.log("Done.");
}

run();
