import { db } from "../lib/db";
import { merchants } from "../lib/db/schema";
import { inArray } from "drizzle-orm";

const approvedNames = ["Nike", "Adidas", "Starbucks"];
const inReviewNames = ["ESPN", "Marriott", "Delta Air Lines", "Whole Foods"];
const dismissedNames: string[] = []; // Sports betting merchants (DraftKings, FanDuel) accept Apple Pay — do not auto-dismiss

async function run() {
  await db.update(merchants).set({ partnerStatus: "approved" })
    .where(inArray(merchants.name, approvedNames));
  console.log(`Set approved: ${approvedNames.join(", ")}`);

  await db.update(merchants).set({ partnerStatus: "in_review" })
    .where(inArray(merchants.name, inReviewNames));
  console.log(`Set in_review: ${inReviewNames.join(", ")}`);

  await db.update(merchants).set({ partnerStatus: "dismissed" })
    .where(inArray(merchants.name, dismissedNames));
  console.log(`Set dismissed: ${dismissedNames.join(", ")}`);

  console.log("Pipeline statuses seeded.");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
