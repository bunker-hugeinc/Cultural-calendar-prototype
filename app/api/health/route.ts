export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
    databaseUrl: !!process.env.DATABASE_URL,
    braveSearchApiKey: !!process.env.BRAVE_SEARCH_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  const allRequired = checks.anthropicApiKey && checks.databaseUrl;

  return Response.json(
    { status: allRequired ? 'ok' : 'degraded', checks },
    { status: allRequired ? 200 : 503 }
  );
}
