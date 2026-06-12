export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { MERCHANT_SIGNALS_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

interface MerchantSignals {
  applePayAffinity: number;
  affinityRationale: string;
  transactionProfile: string;
  marketingOpenness: string;
  outreachApproach: string;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 503 });
  }

  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = `Merchant: ${merchant.name}
Category: ${merchant.category}
Partner Group: ${merchant.partnerGroup ?? "Unknown"}
Seasonal Notes: ${merchant.seasonalNotes ?? "None"}
Past Campaign Notes: ${merchant.pastCampaignNotes ?? "None provided"}
Partner Status: ${merchant.partnerStatus}`;

  const raw = await callClaude({
    system: MERCHANT_SIGNALS_PROMPT,
    user,
    model: "claude-sonnet-4-6",
    maxTokens: 1024,
    temperature: 0.3,
  });

  let signals: MerchantSignals;
  try {
    signals = parseJSON<MerchantSignals>(raw);
  } catch {
    console.error("[signals] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  await db.update(merchants)
    .set({ merchantSignals: JSON.stringify(signals) })
    .where(eq(merchants.id, id));

  return NextResponse.json({ signals });
}
