// Run with: npx tsx scripts/score-all-unscored.ts
// Scores all moments that are missing sub-scores. Safe to re-run.

async function scoreAllUnscored() {
  const res = await fetch("http://localhost:3000/api/moments");
  const data = await res.json();
  const allMoments: { id: string; name: string; audienceRelevance?: number; productConnection?: number; partnerAlignment?: number }[] =
    Array.isArray(data) ? data : (data.moments ?? []);

  const unscored = allMoments.filter(m =>
    !m.audienceRelevance || !m.productConnection || !m.partnerAlignment
  );

  console.log(`Found ${unscored.length} moments needing sub-scores...`);

  for (const moment of unscored) {
    process.stdout.write(`  Scoring: ${moment.name}... `);
    try {
      const r = await fetch(`http://localhost:3000/api/moments/${moment.id}/score`, { method: "POST" });
      const scored = await r.json();
      console.log(`✓ scored ${scored.scored} pairings`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.log(`✗ ${err}`);
    }
  }
  console.log("Done.");
}

scoreAllUnscored();
