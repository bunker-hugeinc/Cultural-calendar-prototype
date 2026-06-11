import { pgTable, text, real, timestamp, boolean, unique } from "drizzle-orm/pg-core";
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
  quarter:     text("quarter"),
  score:       real("score"),
  notes:       text("notes"),
  feedCandidateId:          text("feed_candidate_id"),
  ecommerceScore:           real("ecommerce_score"),
  audienceFit:              real("audience_fit"),
  whiteSpaceScore:          real("white_space_score"),
  scoreRationale:           text("score_rationale"),           // JSON: { ecommerceRationale, audienceRationale, whiteSpaceRationale, overallRationale, whiteSpaceAnalysis }
  channelRecommendations:   text("channel_recommendations"),   // JSON array
  // AI evaluation cache
  competitorAnalysisCache:   text("competitor_analysis_cache"),    // JSON string
  opportunitySummaryCache:   text("opportunity_summary_cache"),
  influencerRecsCache:       text("influencer_recs_cache"),        // JSON string
  channelStrategyCacheData:  text("channel_strategy_cache_data"),  // JSON string
  scoreCacheGeneratedAt:     timestamp("score_cache_generated_at"),
  competitorCacheGeneratedAt: timestamp("competitor_cache_generated_at"),
  influencerCacheGeneratedAt: timestamp("influencer_cache_generated_at"),
  channelCacheGeneratedAt:   timestamp("channel_cache_generated_at"),
  opportunityCacheGeneratedAt: timestamp("opportunity_cache_generated_at"),
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
  partnerStatus: text("partner_status").notNull().default("existing"),
  // "existing" | "potential" | "in_review" | "approved" | "dismissed"
  partnerGroup:  text("partner_group"),
  // "Travel & Staying" | "Clothing" | "Delivery & Rides" | "Big Stores" |
  // "Sports & Entertainment" | "Food" | "Misc" | "Kids"
  merchantSignals:   text("merchant_signals"),    // JSON: { applePayAffinity, affinityRationale, transactionProfile, marketingOpenness, outreachApproach }
  pastCampaignNotes: text("past_campaign_notes"), // Free text — BD/DS insights
  // AI evaluation cache
  competitorAnalysisCache:    text("competitor_analysis_cache"),    // JSON string
  competitorCacheGeneratedAt: timestamp("competitor_cache_generated_at"),
  updatedAt:     timestamp("updated_at").defaultNow(),
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
  createdAt:      timestamp("created_at").defaultNow(),
  // AI pairing cache
  pairingInfluencerCache: text("pairing_influencer_cache"),  // JSON string
  pairingChannelCache:    text("pairing_channel_cache"),     // JSON string
  pairingCompetitorCache: text("pairing_competitor_cache"),  // JSON string
  pairingCacheGeneratedAt: timestamp("pairing_cache_generated_at"),
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
  status:    text("status").notNull().default("pending"), // "pending" | "in_review" | "added" | "dismissed"
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── MOMENT REVIEW ────────────────────────────────────────
export const momentReviews = pgTable("moment_reviews", {
  id:                  text("id").primaryKey().$defaultFn(() => createId()),
  feedCandidateId:     text("feed_candidate_id").notNull().references(() => feedCandidates.id),
  campaignName:        text("campaign_name"),
  lastYearCampaignUrl: text("last_year_campaign_url"),
  inspirationUrls:     text("inspiration_urls"),    // JSON array of strings
  notes:               text("notes"),
  targetQuarter:       text("target_quarter"),       // e.g. "FQ2 2027"
  priorityMerchants:   text("priority_merchants"),   // JSON array of merchant IDs
  submittedAt:         timestamp("submitted_at").defaultNow(),
  reviewedAt:          timestamp("reviewed_at"),
  reviewedBy:          text("reviewed_by"),
  reviewNotes:         text("review_notes"),
  status:              text("status").notNull().default("in_review"),
  // "in_review" | "approved" | "rejected"
});

// ─── PITCHES ──────────────────────────────────────────────
export const pitches = pgTable("pitches", {
  id:               text("id").primaryKey().$defaultFn(() => createId()),
  title:            text("title").notNull(),
  type:             text("type").notNull().default("moment_led"), // "moment_led" | "merchant_led"
  status:           text("status").notNull().default("draft"),    // "draft" | "ready" | "sent" | "approved" | "rejected"
  situation:        text("situation"),
  campaignConcept:  text("campaign_concept"),
  campaignHeadline: text("campaign_headline"),
  keyMessages:      text("key_messages"),       // JSON array of strings
  channelStrategy:  text("channel_strategy"),   // JSON object
  influencerStrategy: text("influencer_strategy"), // JSON array
  nextSteps:        text("next_steps"),
  targetQuarter:    text("target_quarter"),
  attachments:      text("attachments"),         // JSON array {name, url, type}
  // Phase 19: direct moment × merchant FK for auto-populated pitches
  momentId:         text("moment_id").references(() => moments.id),
  merchantId:       text("merchant_id").references(() => merchants.id),
  businessRationale: text("business_rationale"),
  offerMechanics:   text("offer_mechanics"),
  additionalNotes:  text("additional_notes"),
  sentAt:           timestamp("sent_at"),
  approvedAt:       timestamp("approved_at"),
  // Phase 21: ROI narrative blocks
  roiNarrative:                   text("roi_narrative"),
  audienceReachNarrative:         text("audience_reach_narrative"),
  transactionOpportunityNarrative: text("transaction_opportunity_narrative"),
  coMarketingValueNarrative:      text("co_marketing_value_narrative"),
  // Phase 21: POC discovery
  pocSearchResults: text("poc_search_results"),
  pocSearchedAt:    timestamp("poc_searched_at"),
  pocSearchQuery:   text("poc_search_query"),
  // Phase 21: document state
  documentGeneratedAt: timestamp("document_generated_at"),
  lastAutoSavedAt:     timestamp("last_auto_saved_at"),
  exportedAt:          timestamp("exported_at"),
  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
});

export const pitchMoments = pgTable("pitch_moments", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  pitchId:   text("pitch_id").notNull().references(() => pitches.id, { onDelete: "cascade" }),
  momentId:  text("moment_id").notNull().references(() => moments.id),
  isPrimary: boolean("is_primary").default(false),
});

export const pitchMerchants = pgTable("pitch_merchants", {
  id:         text("id").primaryKey().$defaultFn(() => createId()),
  pitchId:    text("pitch_id").notNull().references(() => pitches.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id").notNull().references(() => merchants.id),
  isPrimary:  boolean("is_primary").default(false),
});
