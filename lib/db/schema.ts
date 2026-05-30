import { pgTable, text, real, timestamp, unique } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─── MOMENT ───────────────────────────────────────────────
export const moments = pgTable("moments", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  name:        text("name").notNull(),
  startDate:   text("start_date").notNull(),        // YYYY-MM-DD
  endDate:     text("end_date"),                    // YYYY-MM-DD, optional
  category:    text("category").notNull(),          // "gather" | "improve" | "excite"
  description: text("description").notNull(),
  hook:        text("hook"),
  score:       real("score"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

// ─── MERCHANT ─────────────────────────────────────────────
export const merchants = pgTable("merchants", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  name:          text("name").notNull(),
  category:      text("category").notNull(),
  seasonalNotes: text("seasonal_notes"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ─── PAIRING SCORE ────────────────────────────────────────
export const pairingScores = pgTable("pairing_scores", {
  id:             text("id").primaryKey().$defaultFn(() => createId()),
  momentId:       text("moment_id").notNull().references(() => moments.id, { onDelete: "cascade" }),
  merchantId:     text("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").notNull(),
  campaignAngle:  text("campaign_angle").notNull(),
  rationale:      text("rationale"),
  status:         text("status").notNull().default("draft"),
  // Values: "draft" | "in_review" | "approved" | "live"
  createdAt:      timestamp("created_at").defaultNow(),
  updatedAt:      timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: unique().on(t.momentId, t.merchantId),
}));

// ─── FEED CANDIDATE ───────────────────────────────────────
export const feedCandidates = pgTable("feed_candidates", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  name:      text("name").notNull(),
  startDate: text("start_date").notNull(),   // YYYY-MM-DD
  endDate:   text("end_date"),               // YYYY-MM-DD, optional
  category:  text("category").notNull(),     // "gather" | "improve" | "excite"
  score:     real("score").notNull(),        // Fit score 0–5
  headline:  text("headline").notNull(),     // Short campaign angle headline
  body:      text("body").notNull(),         // Campaign angle body paragraph
  why:       text("why").notNull(),          // "Why this fits" AI rationale
  hook:      text("hook").notNull(),         // Comma-separated hook types
  partners:  text("partners").notNull(),     // JSON array of partner name strings
  personas:  text("personas").notNull(),     // JSON array of {t, h, d} objects
  hashtags:  text("hashtags").notNull(),     // JSON array of hashtag strings
  competing: text("competing").notNull(),    // JSON array of competing brand strings
  status:    text("status").notNull().default("pending"), // "pending" | "added" | "dismissed"
  createdAt: timestamp("created_at").defaultNow(),
});
