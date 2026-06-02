import { relations } from "drizzle-orm/relations";
import { moments, pairingScores, merchants } from "./schema";

export const pairingScoresRelations = relations(pairingScores, ({one}) => ({
	moment: one(moments, {
		fields: [pairingScores.momentId],
		references: [moments.id]
	}),
	merchant: one(merchants, {
		fields: [pairingScores.merchantId],
		references: [merchants.id]
	}),
}));

export const momentsRelations = relations(moments, ({many}) => ({
	pairingScores: many(pairingScores),
}));

export const merchantsRelations = relations(merchants, ({many}) => ({
	pairingScores: many(pairingScores),
}));