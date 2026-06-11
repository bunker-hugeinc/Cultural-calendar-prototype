import { db } from "./db";
import { moments, merchants } from "./db/schema";
import { eq } from "drizzle-orm";

type CacheEntity = "moment" | "merchant";
type CacheOutput = "competitor" | "influencer" | "channel" | "opportunity" | "score";

const CACHE_COL_MAP: Record<CacheOutput, string> = {
  competitor: "competitorAnalysisCache",
  influencer: "influencerRecsCache",
  channel:    "channelStrategyCacheData",
  opportunity: "opportunitySummaryCache",
  score:      "scoreRationale",
};

const TIMESTAMP_COL_MAP: Record<CacheOutput, string> = {
  competitor:  "competitorCacheGeneratedAt",
  influencer:  "influencerCacheGeneratedAt",
  channel:     "channelCacheGeneratedAt",
  opportunity: "opportunityCacheGeneratedAt",
  score:       "scoreCacheGeneratedAt",
};

export async function getCachedOrGenerate<T>({
  entity,
  entityId,
  outputType,
  forceRefresh = false,
  generate,
}: {
  entity: CacheEntity;
  entityId: string;
  outputType: CacheOutput;
  forceRefresh?: boolean;
  generate: () => Promise<T>;
}): Promise<{ data: T; fromCache: boolean; generatedAt: Date | null }> {
  const cacheCol = CACHE_COL_MAP[outputType];
  const timestampCol = TIMESTAMP_COL_MAP[outputType];

  if (!forceRefresh) {
    if (entity === "moment") {
      const [row] = await db.select().from(moments).where(eq(moments.id, entityId)).limit(1);
      const cached = (row as any)[cacheCol];
      const ts = (row as any)[timestampCol];
      if (cached) {
        try {
          return { data: JSON.parse(cached) as T, fromCache: true, generatedAt: ts };
        } catch {
          return { data: cached as T, fromCache: true, generatedAt: ts };
        }
      }
    } else if (entity === "merchant") {
      const [row] = await db.select().from(merchants).where(eq(merchants.id, entityId)).limit(1);
      const cached = (row as any)[cacheCol];
      const ts = (row as any)[timestampCol];
      if (cached) {
        try {
          return { data: JSON.parse(cached) as T, fromCache: true, generatedAt: ts };
        } catch {
          return { data: cached as T, fromCache: true, generatedAt: ts };
        }
      }
    }
  }

  const data = await generate();
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  const now = new Date();

  if (entity === "moment") {
    await db.update(moments)
      .set({ [cacheCol]: serialized, [timestampCol]: now } as any)
      .where(eq(moments.id, entityId));
  } else if (entity === "merchant") {
    await db.update(merchants)
      .set({ [cacheCol]: serialized, [timestampCol]: now } as any)
      .where(eq(merchants.id, entityId));
  }

  return { data, fromCache: false, generatedAt: now };
}
