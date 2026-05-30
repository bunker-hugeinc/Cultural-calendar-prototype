import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { moments, merchants, pairingScores, feedCandidates } from "./db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema: { moments, merchants, pairingScores, feedCandidates } });

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseHook(notes: string): string {
  const match = notes.match(/Hook:\s*([^|]+)/);
  return match ? match[1].trim() : "";
}

function parseScore(notes: string): number {
  const match = notes.match(/Score:\s*([\d.]+)\//);
  return match ? parseFloat(match[1]) : 0;
}

function firstSentence(text: string): string {
  const idx = text.indexOf(". ");
  return idx !== -1 ? text.slice(0, idx + 1) : text;
}

// ─── MOMENTS ──────────────────────────────────────────────────────────────────

const MOMENTS_DATA = [
  { name: "Music Festivals", startDate: "2026-04-01", endDate: "2026-07-31", category: "excite", description: "Festival season, unlocked. Showcase influencers and their walletless looks for festival season with key partners. Unlock festival packages that combine tickets, hotels, and rides.", notes: "Hook: Influencer Curation, Bundle | Score: 5/5" },
  { name: "DIY Renovations", startDate: "2026-04-01", endDate: "2026-05-25", category: "improve", description: "Dream today, pay later. Partner with influencers for a renovation project, showcasing they were able to finance everything they wanted today through Apple Pay.", notes: "Hook: Influencer Curation, Bundle | Score: 3.3/5" },
  { name: "NBA Playoffs + Finals", startDate: "2026-04-18", endDate: "2026-06-19", category: "excite", description: "No timeouts. Stay in the game. No need to wait for the buzzer. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4.6/5" },
  { name: "NHL Stanley Cup", startDate: "2026-04-19", endDate: "2026-06-21", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4/5" },
  { name: "Summer Travel", startDate: "2026-04-01", endDate: "2026-06-30", category: "gather", description: "Your walletless summer. Showcase influencers and their walletless looks for summer with key partners. Influencer curated trip bundles of a destination they like to go to.", notes: "Hook: Bundle | Score: 5/5" },
  { name: "Summer Blockbusters", startDate: "2026-05-01", endDate: "2026-08-31", category: "excite", description: "Opening Night All Access Pass. Exclusive access for Apple Pay users to lock in their seats before they go on sale to the public.", notes: "Hook: Exclusive Access | Score: 4.6/5" },
  { name: "Mother's Day", startDate: "2026-05-10", endDate: "2026-05-10", category: "gather", description: "Thoughtful, faster. Mom's do so much. Treat her to wonderful gifts she actually wants this Mother's Day with key partners and exclusive offers.", notes: "Hook: Values highlight | Score: 4.3/5" },
  { name: "Memorial Day Weekend", startDate: "2026-05-25", endDate: "2026-05-25", category: "gather", description: "Summer starts now. Summer starter pack offers — mixing clothing, home goods, and food delivery — to kick off summer on the right foot.", notes: "Hook: Bundle | Score: 3.6/5" },
  { name: "FIFA World Cup", startDate: "2026-06-11", endDate: "2026-07-19", category: "excite", description: "The ultimate at-home experience. Bundled packages put together by influencers representing key popular countries, featuring kits, recipes, and other items that celebrate national pride.", notes: "Hook: Influencer Curation, Bundle | Score: 5/5" },
  { name: "Father's Day", startDate: "2026-06-21", endDate: "2026-06-21", category: "gather", description: "Beat dad to the bill. An influencer series where kids pay for coffee, activities, and more before dad can — because they have Apple Pay.", notes: "Hook: Values highlight | Score: 4.3/5" },
  { name: "Fourth of July", startDate: "2026-07-04", endDate: "2026-07-04", category: "gather", description: "Accepted on all adventures. Summer brings unexpected travel, maybe even somewhere rural. Showcase Apple Pay is accepted anywhere with contactless payment.", notes: "Hook: Values highlight | Score: 4.6/5" },
  { name: "Back-to-School", startDate: "2026-07-06", endDate: "2026-09-30", category: "improve", description: "Cross off your checklist from anywhere. Showcase moms, dads, and student influencers getting through their back-to-school list while doing something completely different.", notes: "Hook: Values highlight | Score: 4.6/5" },
  { name: "Fall Reset", startDate: "2026-08-15", endDate: "2026-10-15", category: "improve", description: "In transition. Showcase how influencers move from season to season with resetting or decluttering their home and/or their wardrobe.", notes: "Hook: Values highlight | Score: 3.6/5" },
  { name: "Fall Beauty Sales", startDate: "2026-09-01", endDate: "2026-11-10", category: "improve", description: "Get the grails. Influencers often share lists of what they plan to buy during Ulta and Sephora's beauty sales. Showcase how Apple Pay will be ready when the sales go live.", notes: "Hook: Values highlight | Score: 3.6/5" },
  { name: "Labor Day Weekend", startDate: "2026-09-04", endDate: "2026-09-07", category: "gather", description: "Grill and all. Whether you're last minute or planning ahead, get your grill and the rest of the fixings fast and easy through bundled Labor Day packages.", notes: "Hook: Values highlight | Score: 3.6/5" },
  { name: "NFL Season Start", startDate: "2026-09-10", endDate: "2026-09-13", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 3.6/5" },
  { name: "Emmy's", startDate: "2026-09-14", endDate: "2026-09-14", category: "excite", description: "Watch like a winner. Partnership with United Airlines to provide an Emmy's prize package sweepstakes. Use Apple Pay at key merchants to be entered.", notes: "Hook: Sweepstakes | Score: 4/5" },
  { name: "NHL Season Start", startDate: "2026-10-07", endDate: "2026-10-11", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4/5" },
  { name: "NBA Season Tip-Off", startDate: "2026-10-20", endDate: "2026-10-25", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4.6/5" },
  { name: "MLB World Series", startDate: "2026-10-23", endDate: "2026-10-31", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 3.8/5" },
  { name: "Halloween", startDate: "2026-10-31", endDate: "2026-10-31", category: "gather", description: "Last minute magic. Providing Halloween SOS bundles for when you're out of supplies but can't leave the house.", notes: "Hook: Bundle | Score: 3.6/5" },
  { name: "MLS Cup", startDate: "2026-11-14", endDate: "2026-12-07", category: "excite", description: "For the fans. By shopping with key partners, fans automatically enter themselves into a pool to win free tickets to the final MLS Cup.", notes: "Hook: Sweepstakes | Score: 4.5/5" },
  { name: "Thanksgiving", startDate: "2026-11-26", endDate: "2026-11-26", category: "gather", description: "Friendsgiving starter packs. For first-time hosts, create meal bundles and hosting kits to make the event less daunting.", notes: "Hook: Bundle | Score: 4.6/5" },
  { name: "F1 World Championship", startDate: "2026-12-06", endDate: "2026-12-06", category: "excite", description: "As fast as F1. Get expedited delivery and race day bundles from key partners so you don't miss a lap at the final match.", notes: "Hook: Discount/Expedited Shipping | Score: 4/5" },
  { name: "Holiday Season", startDate: "2026-12-01", endDate: "2026-12-25", category: "gather", description: "Gifting, handled. Take the stress out of the holidays by taking a break with bonus loyalty points with every purchase.", notes: "Hook: Loyalty Points | Score: 4.6/5" },
  { name: "New Year's Eve / Day", startDate: "2026-12-31", endDate: "2026-12-31", category: "improve", description: "Start now. Offer discounts with athletic driven companies earlier than the new year so you can get moving on your goals faster with Apple Pay.", notes: "Hook: Discount/Expedited Shipping | Score: 4.6/5" },
  { name: "Primetime Award Season", startDate: "2027-01-10", endDate: "2027-02-28", category: "excite", description: "Watch like a winner. Work with talent associated with award nominees and showcase their curated picks for the perfect award night, bundled with their nominated film/show/album.", notes: "Hook: Influencer Curation, Bundle | Score: 3.8/5" },
  { name: "Marathon Registration", startDate: "2027-01-15", endDate: "2027-04-30", category: "improve", description: "Secure your spot. Apple Pay could unlock early race registration windows and marathon bib + flights + hotel packages that gives you everything beyond your bib to get there.", notes: "Hook: Bundle, Exclusive Access | Score: 4.7/5" },
  { name: "Super Bowl", startDate: "2027-02-07", endDate: "2027-02-14", category: "excite", description: "Stay in the game. A combined Superbowl and Valentine's Day package bundle — Superbowl eats plus flowers and chocolate.", notes: "Hook: Bundle | Score: 3.6/5" },
  { name: "Valentine's Day", startDate: "2027-02-14", endDate: "2027-02-14", category: "gather", description: "Make it meaningful. 1800 Flowers discount on V Day flowers + free expedited shipping with select retailers the few days leading up to Valentine's Day.", notes: "Hook: Bundle, Discount/Expedited Shipping | Score: 3.8/5" },
  { name: "Tax Refund Spending", startDate: "2027-02-20", endDate: "2027-04-30", category: "improve", description: "Treat yourself. Get what you've been wanting all year fast with expedited shipping from key partners and bonus loyalty rewards.", notes: "Hook: Discount/Expedited Shipping, Loyalty Points | Score: 4.7/5" },
  { name: "F1 Season Start", startDate: "2027-03-01", endDate: "2027-03-01", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4/5" },
  { name: "Spring Beauty Sales", startDate: "2027-03-05", endDate: "2027-04-30", category: "improve", description: "Get the grails. Influencers share lists of what they plan to buy during Ulta and Sephora's beauty sales. Showcase how Apple Pay will be ready when the sales go live.", notes: "Hook: Influencer Curation, Values highlight | Score: 3.6/5" },
  { name: "March Madness", startDate: "2027-03-15", endDate: "2027-04-05", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 4.3/5" },
  { name: "Spring Fitness", startDate: "2027-03-14", endDate: "2027-05-15", category: "improve", description: "Start moving. Daylight savings gets people in a mindset to improve. Offer discounts with athletic driven companies so you can get moving on your fitness goals.", notes: "Hook: Discount/Expedited Shipping | Score: 4/5" },
  { name: "Spring Wardrobe Refresh", startDate: "2027-03-14", endDate: "2027-05-15", category: "improve", description: "New season, new look. Showcase how influencers move from season to season with resetting or decluttering their home and/or wardrobe, and how partners help them get there.", notes: "Hook: Influencer Curation | Score: 3.8/5" },
  { name: "MLB Opening Day", startDate: "2027-04-01", endDate: "2027-04-02", category: "excite", description: "No timeouts. Stay in the game. Apple Pay makes ordering food and placing in-play bets instant so you can stay locked in to the seconds that matter.", notes: "Hook: Values highlight | Score: 3.8/5" },
  { name: "Mother's Day 2027", startDate: "2027-05-09", endDate: "2027-05-09", category: "gather", description: "Thoughtful, faster. Apple Pay unlocks priority delivery windows and curated gift sets from favorite gifting partners that make meaningful gifting happen fast.", notes: "Hook: Discount/Expedited Shipping | Score: 4.3/5" },
  { name: "Memorial Day 2027", startDate: "2027-05-31", endDate: "2027-05-31", category: "gather", description: "Summer kick off. Curated influencer summer starter pack offers — mixing clothing, home goods, and food delivery — to kick off summer on the right foot.", notes: "Hook: Bundle, Influencer Curation | Score: 3.6/5" },
  { name: "Father's Day 2027", startDate: "2027-06-20", endDate: "2027-06-20", category: "gather", description: "Beat dad to the bill. Kids pay for coffee, activities, and more for their father before they can because they have Apple Pay — dad has a wallet and takes longer.", notes: "Hook: Values highlight | Score: 4.3/5" },
  { name: "FIFA Women's World Cup", startDate: "2027-06-24", endDate: "2027-07-25", category: "excite", description: "The ultimate at-home experience. Bundled packages put together by influencers representing key popular countries, featuring kits, recipes, and other items that celebrate national pride.", notes: "Hook: Bundle | Score: 5/5" },
] as const;

// ─── MERCHANTS ────────────────────────────────────────────────────────────────

const MERCHANTS_DATA = [
  { name: "1-800 Flowers", category: "Floral", seasonalNotes: "Peak: Mother's Day, Valentine's Day, Thanksgiving", notes: "Gift-driven; strong Q1 and Q2 moments" },
  { name: "Sephora", category: "Beauty", seasonalNotes: "Peak: Fall Beauty Sales, Spring Beauty Sales, Mother's Day", notes: "Major sale events in Sep and Mar drive volume" },
  { name: "Ulta Salon", category: "Beauty", seasonalNotes: "Peak: Fall Beauty Sales, Spring Beauty Sales", notes: "21 Days of Beauty sale is a key activation window" },
  { name: "Etsy", category: "Gifts & Marketplace", seasonalNotes: "Peak: Valentine's Day, Mother's Day, Halloween, Tax Refund", notes: "Custom/handmade gifts; strong across gifting moments" },
  { name: "Macy's", category: "Retail", seasonalNotes: "Peak: Thanksgiving, Valentine's Day", notes: "Holiday and gifting anchor retailer" },
  { name: "Target", category: "Retail", seasonalNotes: "Peak: Back-to-School, Halloween, Holiday Season", notes: "Multi-category; strong Back-to-School and Holiday" },
  { name: "Best Buy", category: "Electronics", seasonalNotes: "Peak: Tax Refund, Father's Day, Holiday Season", notes: "Big-ticket purchases; tax refund and gift-giving peaks" },
  { name: "Nike", category: "Apparel & Footwear", seasonalNotes: "Peak: Back-to-School, New Year's, March Madness, Spring Fitness", notes: "Year-round; spikes around sports moments and fitness resets" },
  { name: "Adidas", category: "Apparel & Footwear", seasonalNotes: "Peak: FIFA World Cup, FIFA Women's World Cup, Marathon Registration", notes: "Soccer/sports focused; World Cup is top moment" },
  { name: "Lululemon", category: "Activewear", seasonalNotes: "Peak: New Year's, Spring Fitness, Marathon Registration", notes: "Fitness resolution and seasonal reset moments" },
  { name: "Alo Yoga", category: "Activewear", seasonalNotes: "Peak: Fall Reset, New Year's, Spring Fitness", notes: "Wellness and reset-driven; Q1 and Q4" },
  { name: "GOAT", category: "Sneakers & Apparel", seasonalNotes: "Peak: Tax Refund, Back-to-School", notes: "Resale/premium sneakers; tax refund spending surge" },
  { name: "Nordstrom", category: "Apparel", seasonalNotes: "Peak: Spring Wardrobe Refresh, Memorial Day", notes: "Premium fashion; seasonal refresh moments" },
  { name: "UGG", category: "Footwear", seasonalNotes: "Peak: Holiday Season", notes: "Cold-weather gift item; Q4 focus" },
  { name: "H&M", category: "Apparel", seasonalNotes: "No defined peak", notes: "Fast fashion; broad seasonal utility" },
  { name: "DoorDash", category: "Food Delivery", seasonalNotes: "Peak: Super Bowl, NBA, NFL, NHL, Halloween", notes: "Sports and event nights; consistent year-round demand" },
  { name: "Uber Eats", category: "Food Delivery", seasonalNotes: "Peak: NFL Season, NBA Tip-Off, Labor Day, March Madness", notes: "Sports watch parties and major event nights" },
  { name: "Instacart", category: "Grocery Delivery", seasonalNotes: "Peak: Thanksgiving, Labor Day, Fourth of July, Holiday Season", notes: "Hosting and holiday grocery runs" },
  { name: "Chipotle", category: "Dining", seasonalNotes: "Peak: NHL, NBA, Sports moments", notes: "Fast casual; sports night ordering" },
  { name: "Wingstop", category: "Dining", seasonalNotes: "Peak: NBA Playoffs, NBA Tip-Off, Super Bowl", notes: "Game day food; strong NBA and football overlap" },
  { name: "McDonald's", category: "Dining", seasonalNotes: "Peak: FIFA World Cup, Fourth of July", notes: "Mass-market QSR; sports and summer moments" },
  { name: "Taco Bell", category: "Dining", seasonalNotes: "Peak: March Madness, MLB World Series", notes: "Late-night and game-day QSR" },
  { name: "Domino's", category: "Dining", seasonalNotes: "Peak: Halloween, March Madness", notes: "Pizza delivery; game nights and stay-home moments" },
  { name: "Starbucks", category: "Coffee & Dining", seasonalNotes: "Peak: Father's Day, Holiday Season", notes: "Gifting and everyday use; loyalty program activation" },
  { name: "Dunkin'", category: "Coffee & Dining", seasonalNotes: "Peak: Father's Day", notes: "Everyday purchase; Father's Day beat-dad-to-the-bill angle" },
  { name: "Crumbl", category: "Dining", seasonalNotes: "Peak: Holiday Season", notes: "Seasonal cookie drops; gifting moment" },
  { name: "Airbnb", category: "Travel & Lodging", seasonalNotes: "Peak: Summer Travel, Music Festivals, Fourth of July", notes: "Experiential travel; summer and festival season" },
  { name: "Expedia", category: "Travel", seasonalNotes: "Peak: Summer Travel, Marathon Registration", notes: "Bundled travel packages; summer and spring" },
  { name: "American Airlines", category: "Travel", seasonalNotes: "Peak: FIFA World Cup, FIFA Women's World Cup, Summer Travel", notes: "International travel; World Cup is key moment" },
  { name: "JetBlue", category: "Travel", seasonalNotes: "Peak: Memorial Day, Summer Travel", notes: "Domestic summer travel" },
  { name: "United Airlines", category: "Travel", seasonalNotes: "Peak: Emmy's", notes: "Sweepstakes/prize activation" },
  { name: "Hotel Tonight", category: "Travel & Lodging", seasonalNotes: "Peak: Memorial Day, Labor Day", notes: "Last-minute booking; holiday weekend travel" },
  { name: "Booking.com", category: "Travel & Lodging", seasonalNotes: "Peak: Fourth of July", notes: "Summer travel and adventure moments" },
  { name: "Lyft", category: "Rides", seasonalNotes: "Peak: Mother's Day, Emmy's, Summer Travel", notes: "Event nights and getting-around moments" },
  { name: "Uber", category: "Rides", seasonalNotes: "Peak: Music Festivals, Fall Reset", notes: "Festival and lifestyle moments" },
  { name: "Ticketmaster", category: "Entertainment", seasonalNotes: "Peak: Music Festivals", notes: "Ticket purchases; festival and live event access" },
  { name: "Fandango", category: "Entertainment", seasonalNotes: "Peak: Summer Blockbusters, Primetime Award Season", notes: "Movie ticketing; blockbuster and award season" },
  { name: "DraftKings", category: "Sports Betting", seasonalNotes: "Peak: NBA Playoffs, NHL, NFL, Super Bowl, F1", notes: "In-play betting across all major sports moments" },
  { name: "FanDuel", category: "Sports Betting", seasonalNotes: "Peak: NBA Tip-Off, MLB, MLS Cup, March Madness, F1", notes: "Sports betting; broad sports calendar coverage" },
  { name: "Fanatics", category: "Sports Merch", seasonalNotes: "Peak: NHL, NBA, MLB, NFL, MLS, F1", notes: "Licensed sports merch; active across all sports moments" },
  { name: "Wayfair", category: "Home & Furniture", seasonalNotes: "Peak: DIY Renovations, Tax Refund, Back-to-School", notes: "Home goods; renovation and spending moments" },
  { name: "Lowe's", category: "Home Improvement", seasonalNotes: "Peak: DIY Renovations, Fall Reset", notes: "Hardware and home improvement; spring and fall resets" },
  { name: "Home Depot", category: "Home Improvement", seasonalNotes: "Peak: DIY Renovations, Father's Day, Spring Wardrobe Refresh", notes: "Home improvement; DIY and gifting for dads" },
  { name: "Mattel", category: "Toys & Entertainment", seasonalNotes: "Peak: Summer Blockbusters", notes: "Movie tie-in merchandise" },
  { name: "TikTok", category: "Social/Media", seasonalNotes: "Peak: Summer Travel", notes: "Platform partner; content amplification" },
] as const;

// ─── PAIRING MAP ──────────────────────────────────────────────────────────────
// merchantName → array of moment names to pair with

const NBA_MOMENTS = ["NBA Playoffs + Finals", "NBA Season Tip-Off"];
const NHL_MOMENTS = ["NHL Stanley Cup", "NHL Season Start"];
const NFL_MOMENTS = ["NFL Season Start"];
const MLB_MOMENTS = ["MLB World Series", "MLB Opening Day"];
const F1_MOMENTS = ["F1 World Championship", "F1 Season Start"];
const MLS_MOMENTS = ["MLS Cup"];
const MOTHERS_DAY_MOMENTS = ["Mother's Day", "Mother's Day 2027"];
const FATHERS_DAY_MOMENTS = ["Father's Day", "Father's Day 2027"];
const MEMORIAL_DAY_MOMENTS = ["Memorial Day Weekend", "Memorial Day 2027"];
const LABOR_DAY_MOMENTS = ["Labor Day Weekend"];
const SUMMER_TRAVEL_MOMENTS = ["Summer Travel"];

const PAIRING_MAP: Record<string, string[]> = {
  "1-800 Flowers": [...MOTHERS_DAY_MOMENTS, "Valentine's Day", "Thanksgiving"],
  "Sephora": ["Fall Beauty Sales", "Spring Beauty Sales", ...MOTHERS_DAY_MOMENTS],
  "Ulta Salon": ["Fall Beauty Sales", "Spring Beauty Sales"],
  "Etsy": ["Valentine's Day", ...MOTHERS_DAY_MOMENTS, "Halloween", "Tax Refund Spending"],
  "Macy's": ["Thanksgiving", "Valentine's Day"],
  "Target": ["Back-to-School", "Halloween", "Holiday Season"],
  "Best Buy": ["Tax Refund Spending", ...FATHERS_DAY_MOMENTS, "Holiday Season"],
  "Nike": ["Back-to-School", "New Year's Eve / Day", "March Madness", "Spring Fitness"],
  "Adidas": ["FIFA World Cup", "FIFA Women's World Cup", "Marathon Registration"],
  "Lululemon": ["New Year's Eve / Day", "Spring Fitness", "Marathon Registration"],
  "Alo Yoga": ["Fall Reset", "New Year's Eve / Day", "Spring Fitness"],
  "GOAT": ["Tax Refund Spending", "Back-to-School"],
  "Nordstrom": ["Spring Wardrobe Refresh", ...MEMORIAL_DAY_MOMENTS],
  "UGG": ["Holiday Season"],
  "DoorDash": ["Super Bowl", ...NBA_MOMENTS, ...NFL_MOMENTS, ...NHL_MOMENTS, "Halloween"],
  "Uber Eats": [...NFL_MOMENTS, "NBA Season Tip-Off", ...LABOR_DAY_MOMENTS, "March Madness"],
  "Instacart": ["Thanksgiving", ...LABOR_DAY_MOMENTS, "Fourth of July", "Holiday Season"],
  "Chipotle": [...NHL_MOMENTS, ...NBA_MOMENTS],
  "Wingstop": ["NBA Playoffs + Finals", "NBA Season Tip-Off", "Super Bowl"],
  "McDonald's": ["FIFA World Cup", "Fourth of July"],
  "Taco Bell": ["March Madness", "MLB World Series"],
  "Domino's": ["Halloween", "March Madness"],
  "Starbucks": [...FATHERS_DAY_MOMENTS, "Holiday Season"],
  "Dunkin'": [...FATHERS_DAY_MOMENTS],
  "Crumbl": ["Holiday Season"],
  "Airbnb": [...SUMMER_TRAVEL_MOMENTS, "Music Festivals", "Fourth of July"],
  "Expedia": [...SUMMER_TRAVEL_MOMENTS, "Marathon Registration"],
  "American Airlines": ["FIFA World Cup", "FIFA Women's World Cup", ...SUMMER_TRAVEL_MOMENTS],
  "JetBlue": [...MEMORIAL_DAY_MOMENTS, ...SUMMER_TRAVEL_MOMENTS],
  "United Airlines": ["Emmy's"],
  "Hotel Tonight": [...MEMORIAL_DAY_MOMENTS, ...LABOR_DAY_MOMENTS],
  "Booking.com": ["Fourth of July"],
  "Lyft": [...MOTHERS_DAY_MOMENTS, "Emmy's", ...SUMMER_TRAVEL_MOMENTS],
  "Uber": ["Music Festivals", "Fall Reset"],
  "Ticketmaster": ["Music Festivals"],
  "Fandango": ["Summer Blockbusters", "Primetime Award Season"],
  "DraftKings": ["NBA Playoffs + Finals", ...NHL_MOMENTS, ...NFL_MOMENTS, "Super Bowl", ...F1_MOMENTS],
  "FanDuel": ["NBA Season Tip-Off", ...MLB_MOMENTS, ...MLS_MOMENTS, "March Madness", ...F1_MOMENTS],
  "Fanatics": [...NHL_MOMENTS, ...NBA_MOMENTS, ...MLB_MOMENTS, ...NFL_MOMENTS, ...MLS_MOMENTS, ...F1_MOMENTS],
  "Wayfair": ["DIY Renovations", "Tax Refund Spending", "Back-to-School"],
  "Lowe's": ["DIY Renovations", "Fall Reset"],
  "Home Depot": ["DIY Renovations", ...FATHERS_DAY_MOMENTS, "Spring Wardrobe Refresh"],
  "Mattel": ["Summer Blockbusters"],
  "TikTok": [...SUMMER_TRAVEL_MOMENTS],
};

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding moments...");

  const momentMap: Record<string, string> = {};
  for (const m of MOMENTS_DATA) {
    const hook = parseHook(m.notes);
    const score = parseScore(m.notes);
    const existing = await db.query.moments.findFirst({ where: eq(moments.name, m.name) });
    if (existing) {
      await db.update(moments).set({ startDate: m.startDate, endDate: m.endDate ?? null, category: m.category, description: m.description, hook, score, updatedAt: new Date() }).where(eq(moments.id, existing.id));
      momentMap[m.name] = existing.id;
    } else {
      const [inserted] = await db.insert(moments).values({ name: m.name, startDate: m.startDate, endDate: m.endDate ?? null, category: m.category, description: m.description, hook, score }).returning({ id: moments.id });
      momentMap[m.name] = inserted.id;
    }
  }
  console.log(`  ✓ ${MOMENTS_DATA.length} moments`);

  console.log("Seeding merchants...");
  const merchantMap: Record<string, string> = {};
  for (const m of MERCHANTS_DATA) {
    const existing = await db.query.merchants.findFirst({ where: eq(merchants.name, m.name) });
    if (existing) {
      merchantMap[m.name] = existing.id;
    } else {
      const [inserted] = await db.insert(merchants).values({ name: m.name, category: m.category, seasonalNotes: m.seasonalNotes, notes: m.notes }).returning({ id: merchants.id });
      merchantMap[m.name] = inserted.id;
    }
  }
  console.log(`  ✓ ${MERCHANTS_DATA.length} merchants`);

  console.log("Seeding pairings...");
  let pairingCount = 0;
  for (const [merchantName, momentNames] of Object.entries(PAIRING_MAP)) {
    const merchantId = merchantMap[merchantName];
    if (!merchantId) { console.warn(`  ⚠ merchant not found: ${merchantName}`); continue; }

    for (const momentName of momentNames) {
      const momentId = momentMap[momentName];
      if (!momentId) { console.warn(`  ⚠ moment not found: ${momentName} (for ${merchantName})`); continue; }

      // Find moment score to compute relevanceScore
      const momentData = MOMENTS_DATA.find(m => m.name === momentName);
      const score = momentData ? parseScore(momentData.notes) : 0;
      const relevanceScore = parseFloat((score * 2).toFixed(1));
      const campaignAngle = momentData ? firstSentence(momentData.description) : "";
      const rationale = momentData?.description ?? "";

      const existing = await db.query.pairingScores.findFirst({
        where: (t, { and }) => and(eq(t.momentId, momentId), eq(t.merchantId, merchantId)),
      });

      if (!existing) {
        await db.insert(pairingScores).values({ momentId, merchantId, relevanceScore, campaignAngle, rationale });
      }
      pairingCount++;
    }
  }
  console.log(`  ✓ ${pairingCount} pairings`);
  console.log("Done.");
}

// ─── FEED CANDIDATES ──────────────────────────────────────────────────────────

const FEED_CANDIDATES_DATA = [
  {
    name: "US Open Tennis 2027",
    startDate: "2027-08-23", endDate: "2027-09-05",
    category: "excite", score: 4.2,
    headline: "Serve Up Summer with Apple Pay",
    body: "The US Open draws 700K+ attendees and 1B+ global viewers. Premium experiences — tickets, travel, food — all at tap speed with Apple Pay.",
    why: "Major summer sports tentpole with strong premium spending signal across travel, dining, and retail partners.",
    hook: "Experiential, Premium",
    partners: JSON.stringify(["StubHub", "Marriott", "Delta", "Shake Shack"]),
    personas: JSON.stringify([
      { t: "Tennis Lifestyle", h: "tennisandthecity", d: "NYC-based tennis content creator covering gear, courts, and tournament culture." },
      { t: "Sports Travel", h: "grandslamphotos", d: "Travel photographer documenting the Grand Slam circuit globally." },
    ]),
    hashtags: JSON.stringify(["#USOpen", "#ApplePay", "#TennisSeason", "#GrandSlam"]),
    competing: JSON.stringify(["Visa (official US Open sponsor)", "Chase Sapphire"]),
  },
  {
    name: "NFL Season Kickoff 2027",
    startDate: "2027-09-04", endDate: "2027-09-07",
    category: "excite", score: 4.8,
    headline: "First Down. Tap Down.",
    body: "The NFL kickoff weekend is the single biggest sports-betting and sports-merch moment of the year. 100M+ viewers, massive DFS spend, jersey drops, bar tabs.",
    why: "Highest sports-betting and sports-merch velocity of the year. Strong partner overlap with DraftKings, Nike, and food delivery.",
    hook: "Cultural Moment, Bundle",
    partners: JSON.stringify(["DraftKings", "Nike", "Instacart", "Buffalo Wild Wings"]),
    personas: JSON.stringify([
      { t: "Fantasy Sports", h: "ffballaddict", d: "Fantasy football analyst with weekly lineup content and 280K followers." },
      { t: "Sports Apparel", h: "kickoffkicks", d: "NFL lifestyle creator covering jersey drops, stadium fits, and watch parties." },
    ]),
    hashtags: JSON.stringify(["#NFLKickoff", "#FantasyFootball", "#ApplePay", "#NFL2027"]),
    competing: JSON.stringify(["Visa NFL partnership", "PayPal DraftKings integration"]),
  },
  {
    name: "Emmy Awards 2027",
    startDate: "2027-09-14", endDate: "2027-09-14",
    category: "improve", score: 3.6,
    headline: "Watch Party, Paid the Apple Way",
    body: "Emmy season drives streaming subscriptions, entertainment spending, and premium fashion. A cultural moment for entertainment-forward audiences.",
    why: "High entertainment spending moment with strong streaming and fashion partner fit.",
    hook: "Values Highlight, Gifting",
    partners: JSON.stringify(["Apple TV+", "Sephora", "Instacart", "Fandango"]),
    personas: JSON.stringify([
      { t: "TV & Film", h: "streamingwithsophia", d: "Entertainment journalist covering prestige TV and awards season." },
    ]),
    hashtags: JSON.stringify(["#Emmys2027", "#WatchParty", "#ApplePay", "#AwardsSeason"]),
    competing: JSON.stringify(["Chase (entertainment rewards)"]),
  },
  {
    name: "NHL Season Start 2027",
    startDate: "2027-10-05", endDate: "2027-10-10",
    category: "excite", score: 3.4,
    headline: "Drop the Puck. Tap to Pay.",
    body: "Hockey season opens with high ticket and merch spend in major markets. Apple Pay integration at arenas is a natural activation point.",
    why: "Arena-native payment moment. Strong fit with sports merch and ride-share partners.",
    hook: "Experiential, Bundle",
    partners: JSON.stringify(["StubHub", "Lyft", "Fanatics", "DraftKings"]),
    personas: JSON.stringify([
      { t: "Hockey Lifestyle", h: "between_the_pipes", d: "Hockey culture creator covering the NHL from a fan-first perspective." },
    ]),
    hashtags: JSON.stringify(["#NHLSeason", "#HockeyNight", "#ApplePay"]),
    competing: JSON.stringify(["Visa (NHL sponsor)"]),
  },
  {
    name: "NBA Tip-Off 2027",
    startDate: "2027-10-14", endDate: "2027-10-21",
    category: "excite", score: 4.1,
    headline: "Season's On. Tap's Ready.",
    body: "NBA Tip-Off is one of the highest-velocity merch and betting moments of the fall. Sneaker drops tied to team colors are a major sub-moment.",
    why: "Massive sneaker and sports merch signal. Strong overlap with Nike, SNKRS, and DraftKings.",
    hook: "Cultural Moment, Product Drop",
    partners: JSON.stringify(["Nike / SNKRS", "DraftKings", "Instacart", "Fanatics"]),
    personas: JSON.stringify([
      { t: "Sneaker Culture", h: "sneakerreport", d: "Sneakerhead creator covering NBA-adjacent drops and basketball fashion." },
      { t: "NBA Analyst", h: "tipofffacts", d: "Stats-first basketball analyst with heavy opening-week content calendar." },
    ]),
    hashtags: JSON.stringify(["#NBATipOff", "#Sneakers", "#ApplePay", "#NBA2027"]),
    competing: JSON.stringify(["PayPal (NBA partner)", "Coinbase"]),
  },
  {
    name: "Halloween 2027",
    startDate: "2027-10-25", endDate: "2027-10-31",
    category: "gather", score: 3.8,
    headline: "Treat Yourself. Tap to Pay.",
    body: "Halloween drives massive costume, candy, décor, and party spend. With a strong peer-to-peer gifting angle and group buy moments.",
    why: "High-volume retail and grocery moment with strong peer-group spending behaviors. Excellent Instacart and Party City fit.",
    hook: "Bundle, Gifting",
    partners: JSON.stringify(["Instacart", "Party City", "Shipt", "DoorDash"]),
    personas: JSON.stringify([
      { t: "Halloween Decor", h: "spookydecorating", d: "Seasonal home decor creator with massive October content volume." },
    ]),
    hashtags: JSON.stringify(["#Halloween2027", "#TrickOrTap", "#ApplePay", "#HalloweenVibes"]),
    competing: JSON.stringify(["Venmo (group party payments)", "PayPal"]),
  },
  {
    name: "Thanksgiving 2027",
    startDate: "2027-11-22", endDate: "2027-11-28",
    category: "gather", score: 4.3,
    headline: "Gather More. Stress Less.",
    body: "Thanksgiving is the highest grocery-delivery and food-prep moment of the year. Instacart, DoorDash, and meal kits all see peak demand.",
    why: "Peak grocery and food delivery moment. Highest single-week Instacart volume of Q4.",
    hook: "Bundle, Values Highlight",
    partners: JSON.stringify(["Instacart", "Whole Foods", "DoorDash", "Williams-Sonoma"]),
    personas: JSON.stringify([
      { t: "Food & Hosting", h: "hostesswiththemostess", d: "Entertaining creator focused on stress-free holiday hosting tips and tablescape." },
    ]),
    hashtags: JSON.stringify(["#Thanksgiving2027", "#GatheredTable", "#ApplePay", "#HolidayCooking"]),
    competing: JSON.stringify(["Visa (Whole Foods co-marketing)", "Chase Sapphire Dining"]),
  },
  {
    name: "Black Friday / Cyber Monday 2027",
    startDate: "2027-11-26", endDate: "2027-11-29",
    category: "excite", score: 4.9,
    headline: "The Biggest Shopping Weekend. Tapped.",
    body: "BFCM is the single largest retail activation of the year. Apple Pay's tap-to-pay is the fastest way through checkout — a direct competitive advantage in this moment.",
    why: "Highest retail-spend weekend of the year. Apple Pay's checkout speed is a direct conversion argument here.",
    hook: "Values Highlight, Exclusive Access",
    partners: JSON.stringify(["Nike", "Best Buy", "Amazon", "Instacart"]),
    personas: JSON.stringify([
      { t: "Deal Hunter", h: "dealalert", d: "BFCM deal aggregator with 500K+ deal-seeker audience." },
      { t: "Tech Deals", h: "geardeals", d: "Consumer tech deal creator with high affiliate conversion rates." },
    ]),
    hashtags: JSON.stringify(["#BlackFriday2027", "#CyberMonday", "#ApplePay", "#BFCM"]),
    competing: JSON.stringify(["Visa", "Mastercard", "PayPal (strong BFCM presence)"]),
  },
  {
    name: "Holiday Season 2027",
    startDate: "2027-12-01", endDate: "2027-12-24",
    category: "gather", score: 4.7,
    headline: "Give the Gift of Tap.",
    body: "The full holiday gifting season. Apparel, electronics, home goods, floral — all categories peak simultaneously. Apple Pay's gift card and tap-to-pay make it the season's payment of choice.",
    why: "All-category peak. Apple Pay gift card angle is especially strong in this window.",
    hook: "Gifting, Bundle",
    partners: JSON.stringify(["Nordstrom", "Apple", "1-800-Flowers", "Nike"]),
    personas: JSON.stringify([
      { t: "Gift Guide Creator", h: "giftguidegoals", d: "Seasonal gift guide creator with massive holiday Q4 reach." },
      { t: "Luxury Lifestyle", h: "luxegifts", d: "Premium gift creator covering high-end holiday picks across apparel and beauty." },
    ]),
    hashtags: JSON.stringify(["#HolidayGifting", "#ApplePay", "#GiftIdeas2027", "#HolidayShopping"]),
    competing: JSON.stringify(["Visa Holiday campaign", "Amex Shop Small", "PayPal Pay Later"]),
  },
  {
    name: "New Year's Eve 2027",
    startDate: "2027-12-29", endDate: "2027-12-31",
    category: "gather", score: 3.9,
    headline: "Ring It In. Tap It Out.",
    body: "NYE drives restaurant reservations, event tickets, party supplies, and premium spirits. Group spending moment with strong ride-share usage.",
    why: "High-value group spend event. Lyft and Resy both see major NYE spikes.",
    hook: "Experiential, Bundle",
    partners: JSON.stringify(["Resy", "Lyft", "Instacart", "Drizly"]),
    personas: JSON.stringify([
      { t: "NYE Party", h: "partyplannerpro", d: "Event and party planner with strong NYE content calendar each December." },
    ]),
    hashtags: JSON.stringify(["#NYE2027", "#NewYearsEve", "#ApplePay", "#RingItIn"]),
    competing: JSON.stringify(["Venmo (group split payments)", "Amex Platinum (Resy co-marketing)"]),
  },
  {
    name: "Grammy Awards & Award Season 2028",
    startDate: "2028-01-26", endDate: "2028-01-26",
    category: "improve", score: 3.5,
    headline: "Award-Worthy Sound. Award-Worthy Pay.",
    body: "The Grammys open awards season with a massive music-streaming and fashion spike. Apple Music adjacency makes this a natural Apple ecosystem moment.",
    why: "Apple Music adjacency is the key angle here. Strong fit for entertainment and beauty partners.",
    hook: "Values Highlight, Cultural Moment",
    partners: JSON.stringify(["Apple Music", "Sephora", "H&M", "Ticketmaster"]),
    personas: JSON.stringify([
      { t: "Music Culture", h: "gramophile", d: "Grammy culture and music awards creator covering artist fashion and performance." },
    ]),
    hashtags: JSON.stringify(["#Grammys2028", "#AwardSeason", "#AppleMusic", "#ApplePay"]),
    competing: JSON.stringify(["Visa (Grammy sponsor)"]),
  },
  {
    name: "Super Bowl 2028",
    startDate: "2028-02-06", endDate: "2028-02-06",
    category: "excite", score: 4.9,
    headline: "The Biggest Day in Sports. Tap Ready.",
    body: "Super Bowl drives the highest single-day food delivery, sports-betting, and merch spend of the year. Apple Pay's speed is the story at every point of purchase.",
    why: "Highest single-day sports spend event of the year. Every partner category peaks simultaneously.",
    hook: "Cultural Moment, Bundle",
    partners: JSON.stringify(["DraftKings", "Instacart", "Nike", "Resy"]),
    personas: JSON.stringify([
      { t: "Game Day Host", h: "superbowlsunday", d: "Game day food and entertaining creator with massive Super Bowl week reach." },
      { t: "Sports Betting", h: "thelinebacker", d: "NFL betting analysis creator with Super Bowl prop bet content." },
    ]),
    hashtags: JSON.stringify(["#SuperBowl2028", "#GameDay", "#ApplePay", "#LVIII"]),
    competing: JSON.stringify(["Visa (NFL/Super Bowl official sponsor)", "PayPal (DraftKings integration)"]),
  },
  {
    name: "Valentine's Day 2028",
    startDate: "2028-02-10", endDate: "2028-02-14",
    category: "improve", score: 4.2,
    headline: "Love Made Easy. Tap to Surprise.",
    body: "Valentine's drives floral, dining, jewelry, and beauty — all premium, all time-sensitive. Apple Pay's speed removes the last-minute gifting friction.",
    why: "High-urgency gifting moment. Floral and dining partners see their annual peak. Last-minute angle is a direct Apple Pay speed story.",
    hook: "Gifting, Experiential",
    partners: JSON.stringify(["1-800-Flowers", "OpenTable", "Sephora", "Etsy"]),
    personas: JSON.stringify([
      { t: "Romance & Gifts", h: "lovelanguagegifts", d: "Gifting and couples creator with heavy Valentine's content volume." },
    ]),
    hashtags: JSON.stringify(["#ValentinesDay2028", "#GiftIdeas", "#ApplePay", "#LastMinuteGifts"]),
    competing: JSON.stringify(["Amex (dining rewards)", "Venmo (couples payments)"]),
  },
  {
    name: "Tax Refund Season 2028",
    startDate: "2028-03-01", endDate: "2028-04-15",
    category: "improve", score: 3.7,
    headline: "Your Refund. Your Rules. Tap It.",
    body: "Tax refund season is a major discretionary spending moment — electronics, travel, home goods. Apple Pay makes spending the refund easy across every category.",
    why: "Broad discretionary spend moment with high electronics and travel conversion. Good fit for Best Buy, Expedia.",
    hook: "Values Highlight, Bundle",
    partners: JSON.stringify(["Best Buy", "Expedia", "Home Depot", "Nike"]),
    personas: JSON.stringify([
      { t: "Personal Finance", h: "refundready", d: "Personal finance creator focused on smart refund spending tips and deal-hunting." },
    ]),
    hashtags: JSON.stringify(["#TaxRefund2028", "#RefundSeason", "#ApplePay", "#SmartSpending"]),
    competing: JSON.stringify(["H&R Block Emerald Card", "TurboTax Visa"]),
  },
];

async function seedFeedCandidates() {
  console.log("Seeding feed candidates...");
  let inserted = 0;
  for (const c of FEED_CANDIDATES_DATA) {
    const existing = await db.query.feedCandidates.findFirst({
      where: eq(feedCandidates.name, c.name),
    });
    if (!existing) {
      await db.insert(feedCandidates).values(c);
      inserted++;
    }
  }
  console.log(`  ✓ ${inserted} inserted, ${FEED_CANDIDATES_DATA.length - inserted} already existed`);
}

seed()
  .then(() => seedFeedCandidates())
  .catch((err) => { console.error(err); process.exit(1); });
