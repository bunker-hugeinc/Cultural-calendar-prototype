import { db } from "../lib/db";
import { merchants } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const categoryFixes: { name: string; category: string }[] = [
  { name: "ESPN", category: "Media & Sports" },
  { name: "CVS", category: "Retail Pharmacy" },
  { name: "Dick's Sporting Goods", category: "Sporting Goods Retail" },
  { name: "Patagonia", category: "Outdoor Apparel" },
  { name: "REI", category: "Outdoor Retail" },
  { name: "DraftKings", category: "Sports Betting & Gaming" },
  { name: "FanDuel", category: "Sports Betting & Gaming" },
  { name: "Tennis Warehouse", category: "Sporting Goods Retail" },
  { name: "Expedia", category: "Travel & Booking" },
  { name: "JetBlue", category: "Airlines & Travel" },
  { name: "Booking.com", category: "Travel & Booking" },
  { name: "Airbnb", category: "Travel & Accommodation" },
];

async function run() {
  for (const fix of categoryFixes) {
    const result = await db
      .update(merchants)
      .set({ category: fix.category })
      .where(eq(merchants.name, fix.name));
    console.log(`Updated: ${fix.name} → ${fix.category}`);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
