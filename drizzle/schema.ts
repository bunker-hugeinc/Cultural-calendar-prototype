import { pgTable, text, timestamp, real, foreignKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const merchants = pgTable("merchants", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	seasonalNotes: text("seasonal_notes"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const moments = pgTable("moments", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	category: text().notNull(),
	description: text().notNull(),
	hook: text(),
	score: real(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const pairingScores = pgTable("pairing_scores", {
	id: text().primaryKey().notNull(),
	momentId: text("moment_id").notNull(),
	merchantId: text("merchant_id").notNull(),
	relevanceScore: real("relevance_score").notNull(),
	campaignAngle: text("campaign_angle").notNull(),
	rationale: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	status: text().default('draft').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.momentId],
			foreignColumns: [moments.id],
			name: "pairing_scores_moment_id_moments_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.id],
			name: "pairing_scores_merchant_id_merchants_id_fk"
		}).onDelete("cascade"),
	unique("pairing_scores_moment_id_merchant_id_unique").on(table.momentId, table.merchantId),
]);

export const feedCandidates = pgTable("feed_candidates", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"),
	category: text().notNull(),
	score: real().notNull(),
	headline: text().notNull(),
	body: text().notNull(),
	why: text().notNull(),
	hook: text().notNull(),
	partners: text().notNull(),
	personas: text().notNull(),
	hashtags: text().notNull(),
	competing: text().notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});
